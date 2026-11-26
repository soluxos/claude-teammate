# Teammate: concept prototype

A scripted, playable prototype of "Teammate", a concept feature for Claude: a working session (a voice call over a shared canvas) where a person and Claude solve an open-ended design problem together. This is a private design exercise and is not an Anthropic product. It is a performance, not a product. Nothing calls a language model at runtime; every word, cursor movement and card movement is authored in `src/script/script.ts` and played back in sync with pre-generated audio.

The build spec lives outside this repo.

## Visual styling

The interface follows Claude's own light theme: layout, colours, type sizes, weights, radii and spacing were measured from the live app and are set as tokens at the top of `src/styles.css`. Two things are stand-ins, because the originals are licensed and are not in this repo:

- Typefaces: the CSS asks for `anthropic-sans` and `anthropic-serif` first and falls back to Inter and Source Serif 4. If you have a licence, drop `anthropic-sans.woff2` and `anthropic-serif.woff2` into `public/brand/` and restart; they are picked up automatically.
- Icons: drawn for this prototype in `src/components/Icon.tsx` to sit in the same positions and sizes.

`DESIGN.md` describes Claude's marketing site and is kept only for reference.

## Setup

Requires Node 20.19 or later.

```bash
npm install
npm run dev
```

Open the printed URL at about 1440 by 900 and click **Play the demo** on the start screen. The demo then runs by itself: it opens Teammate from Claude's New page, starts a session, and goes straight into the call. Callum and Claude say hello, Callum briefs Claude on the problem, both think aloud while they build their own versions, and they finish with a decision record in chat.

Controls (the dark bar at the top is prototype chrome, not part of the concept):

- Space: play or pause. Left and right arrows: previous or next scene.
- Drag the scrubber to any point. The canvas is rebuilt for that moment.
- The speaker icon and slider set the volume (remembered between visits). `1x` / `1.25x` toggles speed. `CC` in the call bar toggles captions.

Without audio files the prototype still plays end to end: captions advance at reading pace, voice rings use a synthetic envelope, and the bar shows "Audio not generated".

## Generating audio: `npm run audio`

Audio is generated once with ElevenLabs and committed, so the browser never sees an API key. It needs `ffmpeg` on your PATH (for example `brew install ffmpeg`).

Each scene is generated as one conversation with the ElevenLabs Text to Dialogue endpoint (model `eleven_v4` by default), so the two voices react to each other instead of reading isolated lines. The scene is then cut into one mp3 per line with word timings. This is what makes the delivery sound natural; generating lines one at a time sounds noticeably flatter.

1. Copy `.env.example` to `.env` (git-ignored) and set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_AGENT` and `ELEVENLABS_VOICE_CALLUM`. `ELEVENLABS_MODEL` is optional.
2. Run:

```bash
npm run audio
```

This writes `public/audio/{id}.mp3` and `public/audio/{id}.json` for every spoken line and records a hash per scene in `public/audio/manifest.json`. Scenes whose lines, voices and settings are unchanged are skipped.

```bash
npm run audio -- --only s3-03
```

```bash
npm run audio -- --force
```

`--only` regenerates the whole scene containing that line (or a comma-separated list of lines), because a line is only natural in the context of its conversation. The model is not deterministic, so each run gives a slightly different performance: if a scene sounds off, run it again.

Matching the two voices' loudness: after cutting, each line's loudness is measured (integrated LUFS, EBU R128) and the gain needed to reach -20 LUFS is saved in its json. The player applies that gain, with a limiter for the loudest peaks, so neither voice is louder than the other. To re-measure without calling the API:

```bash
npm run audio -- --level
```

Recordings in the override folder are played as they are, so level those yourself.

Shaping delivery, in `src/script/script.ts`:

- `delivery` on a line adds audio tags for the voice model, such as `[jumping in]`, `[thoughtful]` or `[exhales]`. Tags are never shown or captioned.
- End a line with a dash ("Can you write that up as a—") and the voice breaks off. Give the next line a negative `gapBefore` and it starts over the end of that line: an interruption.
- Parentheticals such as "(pause)" are stripped before text is sent and shown only in captions.

The key is never printed or written to a file. Restart `npm run dev` or rebuild after adding audio if the page does not pick it up. The total runtime is shown at the right of the scrubber. It is currently about four and a half minutes, over the four-minute target in the original spec.

## Recording your own lines: the override folder

Drop a recording at `public/audio/override/{id}.mp3` (for example `s1-02.mp3`) and it is used instead of the generated file. If no `public/audio/override/{id}.json` sits beside it, word timings are spread across the recording's length by word size, so captions and word-anchored events stay roughly in step. Line ids are listed in `src/script/script.ts`.

## How it works

- `src/script/script.ts`: all lines, beats and timeline events. Events are anchored to a word in a line where possible, so timing survives a change of voice.
- `src/script/layouts.ts`: named card positions for each zone.
- `src/engine/timeline.ts`: builds a flat list of absolute event times from line durations and gaps, and runs the clock. Audio is the master clock while a line is sounding.
- `src/engine/state.ts`: canvas state as a pure function of the events that have fired. Scrubbing resets and replays events up to the target time without animation.
- `src/engine/audio.ts`: one preloaded audio element per line, so speakers hand over without a gap and one can talk over the other. A single click unlocks them all. Each speaker has an analyser for the voice rings.
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
