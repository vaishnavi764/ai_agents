# Echo Bot v2 — Murf Voice

Record mic audio in the browser, transcribe with Whisper, synthesize with Murf TTS, and play the result.

## Setup

1. Create `.env` from template:

```
cp .env.example .env
```

2. Fill in your keys in `.env`:

- `OPENAI_API_KEY`
- `MURF_API_KEY`
- (optional) `MURF_VOICE_ID`, `MURF_AUDIO_FORMAT`

3. Install and run:

```
npm install
npm start
```

Open http://localhost:3000 and click Start Recording.

## Endpoints

- `POST /api/echo-murf` — multipart form with `audio` (webm/opus). Returns audio bytes (mp3/wav).
- `POST /api/transcribe` — returns `{ text }`.
- `POST /api/tts` — body `{ text, voiceId?, format? }` returns audio bytes.
- `GET /api/health` — basic config status.