// Build-time audio generation. Run with `npm run audio`. Needs ffmpeg on the PATH.
//
//   npm run audio                  generate scenes whose lines, voices or settings changed
//   npm run audio -- --only s3-03  regenerate the scene containing that line (comma-separate for several)
//   npm run audio -- --force       regenerate everything
//   npm run audio -- --level       only re-measure loudness of the existing files (no API calls)
//
// Each scene is generated as ONE conversation with the ElevenLabs Text to Dialogue endpoint:
//   POST https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps
// so the two voices react to each other (turn-taking, cut-offs, tone) instead of reading isolated
// lines. The response holds { audio_base64, voice_segments[], alignment }, where each voice segment
// gives the start and end time and character range of one input. The scene is then cut into one
// mp3 per line, with word timings, which is what the player loads.
// The API key is read from the environment and is never printed or written anywhere.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { lines, splitDirection, type Line, type Speaker } from '../src/script/script';

config({ quiet: true });

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio');
const MANIFEST = path.join(OUT, 'manifest.json');
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_v4';
const OUTPUT_FORMAT = 'mp3_44100_128';
// Below the default of 0.5 for a wider emotional range: colleagues, not presenters.
const SETTINGS = { stability: 0.4 };
const MAX_CHARS = 1800; // the endpoint is reliable up to about 2,000 characters per request
const TARGET_LUFS = -20; // every line is played back at this loudness, so neither voice is louder
const PEAK_CEILING = 2; // dBTP after gain. The player's limiter catches the few peaks that pass 0

const apiKey = process.env.ELEVENLABS_API_KEY;
const voices: Record<Speaker, string | undefined> = {
  agent: process.env.ELEVENLABS_VOICE_AGENT,
  callum: process.env.ELEVENLABS_VOICE_CALLUM,
};

type Alignment = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
type Segment = { start_time_seconds: number; end_time_seconds: number; character_start_index: number; character_end_index: number; dialogue_input_index: number };
type Dialogue = { audio_base64: string; voice_segments: Segment[]; alignment: Alignment | null };
type Word = { word: string; start: number; end: number };
type Manifest = Record<string, { hash: string }>;

const args = process.argv.slice(2);
const force = args.includes('--force');
const levelOnly = args.includes('--level');
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? (args[onlyAt + 1] ?? '').split(',').filter(Boolean) : null;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** What the voice model is sent: delivery tags, then the words. "(pause)" style directions are dropped. */
const spoken = (line: Line) => splitDirection(line.text).spoken;
const prompt = (line: Line) => (line.delivery ? `${line.delivery} ${spoken(line)}` : spoken(line));

/** Scenes, split further if one would exceed the request limit. */
function chunks(): { key: string; lines: Line[] }[] {
  const out: { key: string; lines: Line[] }[] = [];
  for (const line of lines) {
    const last = out[out.length - 1];
    const size = last ? last.lines.reduce((n, l) => n + prompt(l).length, 0) : 0;
    if (last && last.lines[0].scene === line.scene && size + prompt(line).length <= MAX_CHARS) last.lines.push(line);
    else out.push({ key: `scene-${line.scene}-${out.filter((c) => c.lines[0].scene === line.scene).length + 1}`, lines: [line] });
  }
  return out;
}

/** Word timings for characters [from, to), relative to `origin`, skipping [audio tags]. */
function toWords(a: Alignment, from: number, to: number, origin: number): Word[] {
  const words: Word[] = [];
  let current: Word | null = null;
  let inTag = false;
  for (let i = from; i < to; i++) {
    const ch = a.characters[i];
    if (ch === '[') inTag = true;
    if (inTag || /\s/.test(ch)) {
      if (current) words.push(current);
      current = null;
      if (ch === ']') inTag = false;
      continue;
    }
    const start = a.character_start_times_seconds[i] - origin;
    const end = a.character_end_times_seconds[i] - origin;
    if (current) {
      current.word += ch;
      current.end = end;
    } else current = { word: ch, start, end };
  }
  if (current) words.push(current);
  return words;
}

/**
 * Measures a line's integrated loudness (LUFS, EBU R128) and returns the playback gain that brings
 * it to the target. The gain is stored beside the word timings and applied by the player, so the
 * audio itself is not re-encoded.
 */
function measure(file: string): { lufs: number; gainDb: number } {
  // ffmpeg prints the measurement to stderr.
  const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {
    encoding: 'utf8',
  }).stderr;
  const stats = JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1));
  const lufs = Number(stats.input_i);
  const peak = Number(stats.input_tp);
  if (!Number.isFinite(lufs)) return { lufs: TARGET_LUFS, gainDb: 0 };
  const gainDb = Math.max(-12, Math.min(12, TARGET_LUFS - lufs, PEAK_CEILING - peak));
  return { lufs, gainDb: Math.round(gainDb * 100) / 100 };
}

/** Writes loudness into a line's json, keeping whatever word timings are there. */
function writeLevel(id: string, text: string) {
  const json = path.join(OUT, `${id}.json`);
  const existing = fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : { id, text, words: [] };
  const level = measure(path.join(OUT, `${id}.mp3`));
  fs.writeFileSync(json, JSON.stringify({ ...existing, ...level }, null, 1));
  return level;
}

async function synthesise(group: Line[]): Promise<Dialogue> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=${OUTPUT_FORMAT}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_id: MODEL,
      settings: SETTINGS,
      inputs: group.map((line) => ({ text: prompt(line), voice_id: voices[line.speaker] })),
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return (await res.json()) as Dialogue;
}

function levelExisting() {
  const report: Record<Speaker, number[]> = { agent: [], callum: [] };
  for (const line of lines) {
    if (!fs.existsSync(path.join(OUT, `${line.id}.mp3`))) continue;
    const { lufs, gainDb } = writeLevel(line.id, spoken(line));
    report[line.speaker].push(lufs + gainDb);
    console.log(`  ${line.id}  ${line.speaker.padEnd(6)}  ${lufs.toFixed(1)} LUFS  ${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)} dB`);
  }
  for (const who of ['callum', 'agent'] as const) {
    const v = report[who];
    if (v.length) console.log(`${who}: plays back between ${Math.min(...v).toFixed(1)} and ${Math.max(...v).toFixed(1)} LUFS (target ${TARGET_LUFS})`);
  }
}

async function main() {
  if (levelOnly) return levelExisting();
  if (!apiKey) fail('ELEVENLABS_API_KEY is not set. Copy .env.example to .env and fill it in.');
  if (!voices.agent || !voices.callum) fail('Set ELEVENLABS_VOICE_AGENT and ELEVENLABS_VOICE_CALLUM in .env.');
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    fail('ffmpeg is needed to cut each scene into lines. Install it (for example `brew install ffmpeg`) and run again.');
  }
  const unknown = only?.filter((id) => !lines.some((l) => l.id === id)) ?? [];
  if (unknown.length) fail(`Unknown line id: ${unknown.join(', ')}`);

  fs.mkdirSync(OUT, { recursive: true });
  const manifest: Manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'working-session-audio-'));
  let made = 0;
  let skipped = 0;

  for (const chunk of chunks()) {
    if (only && !chunk.lines.some((l) => only.includes(l.id))) continue;
    const hash = createHash('sha256')
      .update(JSON.stringify([MODEL, SETTINGS, chunk.lines.map((l) => [l.id, prompt(l), voices[l.speaker]])]))
      .digest('hex')
      .slice(0, 16);
    const complete = chunk.lines.every((l) => fs.existsSync(path.join(OUT, `${l.id}.mp3`)));
    if (!force && manifest[chunk.key]?.hash === hash && complete) {
      skipped += chunk.lines.length;
      continue;
    }

    console.log(`${chunk.key}: ${chunk.lines.length} lines as one conversation`);
    const data = await synthesise(chunk.lines);
    const whole = path.join(tmp, `${chunk.key}.mp3`);
    fs.writeFileSync(whole, Buffer.from(data.audio_base64, 'base64'));

    chunk.lines.forEach((line, i) => {
      const segs = data.voice_segments.filter((s) => s.dialogue_input_index === i);
      if (!segs.length) throw new Error(`No audio came back for ${line.id}`);
      const start = Math.min(...segs.map((s) => s.start_time_seconds));
      const end = Math.max(...segs.map((s) => s.end_time_seconds));
      // Re-encode so the cut is exact to the sample.
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', whole, '-ss', String(start), '-to', String(end), '-c:a', 'libmp3lame', '-b:a', '128k', path.join(OUT, `${line.id}.mp3`)]);

      const expected = spoken(line).split(/\s+/).filter(Boolean).length;
      const from = Math.min(...segs.map((s) => s.character_start_index));
      const to = Math.max(...segs.map((s) => s.character_end_index));
      const words = data.alignment ? toWords(data.alignment, from, to, start) : [];
      const json = path.join(OUT, `${line.id}.json`);
      const usable = words.length === expected; // otherwise the player falls back to evenly paced words
      fs.writeFileSync(json, JSON.stringify({ id: line.id, text: spoken(line), duration: end - start, words: usable ? words : [] }, null, 1));
      const { gainDb } = writeLevel(line.id, spoken(line));
      console.log(`  ${line.id}  ${line.speaker.padEnd(6)}  ${(end - start).toFixed(1)}s  ${gainDb >= 0 ? '+' : ''}${gainDb.toFixed(1)} dB${usable ? '' : `  (no usable word timings: ${words.length} of ${expected})`}`);
      made++;
    });
    manifest[chunk.key] = { hash };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Done. ${made} lines generated, ${skipped} unchanged.`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
