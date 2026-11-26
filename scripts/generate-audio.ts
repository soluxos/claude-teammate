// Build-time audio generation. Run with `npm run audio`.
//
//   npm run audio                  generate lines whose text or voice changed
//   npm run audio -- --only s3-03  one line (comma-separate for several)
//   npm run audio -- --force       regenerate everything
//
// Uses the ElevenLabs "text to speech with timestamps" endpoint:
//   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
// which returns { audio_base64, alignment, normalized_alignment }, where each alignment has
// characters[], character_start_times_seconds[] and character_end_times_seconds[].
// The API key is read from the environment and is never printed or written anywhere.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { lines, splitDirection, type Line, type Speaker, type VoiceSettings } from '../src/script/script';

config({ quiet: true });

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio');
const MANIFEST = path.join(OUT, 'manifest.json');
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

const apiKey = process.env.ELEVENLABS_API_KEY;
const voices: Record<Speaker, string | undefined> = {
  agent: process.env.ELEVENLABS_VOICE_AGENT,
  callum: process.env.ELEVENLABS_VOICE_CALLUM,
};

// Colleagues, not presenters: moderate stability keeps delivery natural and a little informal.
const baseSettings: Record<Speaker, Required<VoiceSettings>> = {
  agent: { stability: 0.5, similarity_boost: 0.75, style: 0, speed: 0.97 },
  callum: { stability: 0.45, similarity_boost: 0.75, style: 0.1, speed: 1 },
};

type Alignment = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
type Manifest = Record<string, { hash: string }>;

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? (args[onlyAt + 1] ?? '').split(',').filter(Boolean) : null;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Character timings to word timings: a word runs from its first character to its last. */
function toWords(a: Alignment) {
  const words: { word: string; start: number; end: number }[] = [];
  let current: { word: string; start: number; end: number } | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = null;
    } else if (current) {
      current.word += ch;
      current.end = a.character_end_times_seconds[i];
    } else {
      current = { word: ch, start: a.character_start_times_seconds[i], end: a.character_end_times_seconds[i] };
    }
  });
  if (current) words.push(current);
  return words;
}

async function synthesise(line: Line, text: string, index: number) {
  const voiceId = voices[line.speaker]!;
  const spoken = (l?: Line) => (l ? splitDirection(l.text).spoken : undefined);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { ...baseSettings[line.speaker], ...line.voice, use_speaker_boost: true },
        // Neighbouring lines give the model context, so each line sounds like part of a conversation.
        previous_text: spoken(lines[index - 1]),
        next_text: spoken(lines[index + 1]),
      }),
    },
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    throw new Error(`ElevenLabs returned ${res.status} for ${line.id}: ${detail}`);
  }
  return (await res.json()) as { audio_base64: string; alignment: Alignment | null; normalized_alignment: Alignment | null };
}

async function main() {
  if (!apiKey) fail('ELEVENLABS_API_KEY is not set. Copy .env.example to .env and fill it in.');
  if (!voices.agent || !voices.callum) fail('Set ELEVENLABS_VOICE_AGENT and ELEVENLABS_VOICE_CALLUM in .env.');
  const unknown = only?.filter((id) => !lines.some((l) => l.id === id)) ?? [];
  if (unknown.length) fail(`Unknown line id: ${unknown.join(', ')}`);

  fs.mkdirSync(OUT, { recursive: true });
  const manifest: Manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  let made = 0;
  let skipped = 0;

  for (const [index, line] of lines.entries()) {
    if (only && !only.includes(line.id)) continue;
    // Parentheticals such as "(pause)" are direction: expressed through gapBefore and voice settings.
    const text = splitDirection(line.text).spoken;
    const settings = { ...baseSettings[line.speaker], ...line.voice };
    const hash = createHash('sha256')
      .update(JSON.stringify([text, voices[line.speaker], MODEL, settings]))
      .digest('hex')
      .slice(0, 16);
    const mp3 = path.join(OUT, `${line.id}.mp3`);
    if (!force && manifest[line.id]?.hash === hash && fs.existsSync(mp3)) {
      skipped++;
      continue;
    }

    process.stdout.write(`${line.id}  ${line.speaker.padEnd(6)}  `);
    const data = await synthesise(line, text, index);
    fs.writeFileSync(mp3, Buffer.from(data.audio_base64, 'base64'));

    const expected = text.split(/\s+/).filter(Boolean).length;
    const words = [data.alignment, data.normalized_alignment].filter((a): a is Alignment => !!a).map(toWords).find((w) => w.length === expected);
    const json = path.join(OUT, `${line.id}.json`);
    if (words) {
      fs.writeFileSync(json, JSON.stringify({ id: line.id, text, duration: words[words.length - 1].end, words }, null, 1));
      console.log(`${words[words.length - 1].end.toFixed(1)}s`);
    } else {
      // The player falls back to evenly paced words for this line.
      fs.rmSync(json, { force: true });
      console.log('audio written, no usable alignment');
    }
    manifest[line.id] = { hash };
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    made++;
  }
  console.log(`Done. ${made} generated, ${skipped} unchanged.`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
