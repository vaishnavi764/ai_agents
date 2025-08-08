# Echo Bot v2 (Murf)

- POST `/tts/echo` with `multipart/form-data`, field `audio` (WebM/MP3/WAV). Returns `{ url, transcript }`.
- Client UI at `/` records microphone, uploads to `/tts/echo`, and plays Murf audio.

## Setup

1. Copy `.env.example` to `.env` and set `ASSEMBLYAI_API_KEY` and `MURF_API_KEY`.
2. Install deps: `npm install`
3. Run: `npm run dev` (nodemon) or `npm start`

## Notes
- Uses AssemblyAI upload + transcription polling.
- Uses Murf REST API `v1/speech/generate` with configurable `MURF_VOICE_ID`.
- Client records `audio/webm`; server uploads bytes to AssemblyAI; then generates TTS and returns the hosted audio URL.
