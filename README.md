# Working session: concept prototype

A scripted, playable prototype of a "working session": a voice call over a shared canvas where a person and an AI assistant solve an open-ended design problem together. It is a performance, not a product. Nothing calls a language model at runtime; every word, cursor movement and card movement is authored in `src/script/script.ts` and played back in sync with pre-generated audio.

The build spec lives outside this repo; `DESIGN.md` holds the visual reference the interface follows.

## Setup

Requires Node 20.19 or later.

```bash
npm install
npm run dev
```

Open the printed URL at about 1440 by 900. The opening chat plays by itself; click **Start working session** to begin the session with sound.

Controls (the dark bar at the top is prototype chrome, not part of the concept):

- Space: play or pause. Left and right arrows: previous or next scene.
- Drag the scrubber to any point. The canvas is rebuilt for that moment.
- `1x` / `1.25x` toggles speed. `CC` in the call bar toggles captions.

Without audio files the prototype still plays end to end: captions advance at reading pace, voice rings use a synthetic envelope, and the bar shows "Audio not generated".

## Generating audio: `npm run audio`

Audio is generated once with ElevenLabs and committed, so the browser never sees an API key.

1. Copy `.env.example` to `.env` (git-ignored) and set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_AGENT` and `ELEVENLABS_VOICE_CALLUM`. Pick two clearly different voices: the agent warm, unhurried and mid-pitched; Callum a conversational British male voice. `ELEVENLABS_MODEL` is optional (default `eleven_multilingual_v2`).
2. Run:

```bash
npm run audio
```

For each spoken line this writes `public/audio/{id}.mp3` and `public/audio/{id}.json` (word-level timings derived from the character alignment), and records a hash in `public/audio/manifest.json`. Lines whose text, voice and settings are unchanged are skipped.

```bash
npm run audio -- --only s3-03
```

```bash
npm run audio -- --force
```

`--only` takes one id or a comma-separated list. Parentheticals such as "(pause)" are stripped before text is sent and expressed through `gapBefore` and per-line `voice` settings in the script instead. The key is never printed or written to a file.

Restart `npm run dev` or rebuild after adding audio if the page does not pick it up. Then run `npm run check` to confirm the total runtime is still between 2.5 and 4 minutes (it estimates from reading pace, so also check the time shown in the playback bar).

## Recording your own lines: the override folder

Drop a recording at `public/audio/override/{id}.mp3` (for example `s1-02.mp3`) and it is used instead of the generated file. If no `public/audio/override/{id}.json` sits beside it, word timings are spread across the recording's length by word size, so captions and word-anchored events stay roughly in step. Line ids are listed in `src/script/script.ts`.

## How it works

- `src/script/script.ts`: all lines, beats and timeline events. Events are anchored to a word in a line where possible, so timing survives a change of voice.
- `src/script/layouts.ts`: named card positions for each zone.
- `src/engine/timeline.ts`: builds a flat list of absolute event times from line durations and gaps, and runs the clock. Audio is the master clock while a line is sounding.
- `src/engine/state.ts`: canvas state as a pure function of the events that have fired. Scrubbing resets and replays events up to the target time without animation.
- `src/engine/audio.ts`: one reusable audio element (so a single click unlocks sound in every browser), an analyser for the voice rings, and room tone generated from filtered noise.
- `scripts/generate-audio.ts`: the build-time ElevenLabs script.

## Deploying

The output is a static site with relative asset paths, so it can be served from any folder.

```bash
npm run build
```

```bash
npm run preview
```

Upload the `dist` folder to any static host (Netlify, Vercel, GitHub Pages, an S3 bucket, or similar). No environment variables are needed at build time or at runtime; never put the ElevenLabs key in the host's settings.
