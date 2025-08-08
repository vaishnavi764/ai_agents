import express from 'express';
import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve client
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Helpers
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToAssemblyAI(audioBuffer) {
  const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!assemblyApiKey) throw new Error('Missing ASSEMBLYAI_API_KEY');

  const readable = new Readable({ read() {} });
  readable.push(audioBuffer);
  readable.push(null);

  const uploadUrl = 'https://api.assemblyai.com/v2/upload';
  const uploadResp = await axios.post(uploadUrl, readable, {
    headers: {
      authorization: assemblyApiKey,
      'content-type': 'application/octet-stream',
      'transfer-encoding': 'chunked',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  if (!uploadResp?.data?.upload_url) {
    throw new Error('AssemblyAI upload failed');
  }

  return uploadResp.data.upload_url;
}

async function transcribeWithAssemblyAI(audioUrl) {
  const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
  const createResp = await axios.post(
    'https://api.assemblyai.com/v2/transcript',
    {
      audio_url: audioUrl,
      language_detection: true,
      punctuate: true,
      format_text: true,
    },
    {
      headers: { authorization: assemblyApiKey },
    }
  );

  const id = createResp?.data?.id;
  if (!id) throw new Error('AssemblyAI transcript creation failed');

  // Poll
  let attempts = 0;
  const maxAttempts = 60; // up to ~60s
  const pollingUrl = `https://api.assemblyai.com/v2/transcript/${id}`;
  while (attempts < maxAttempts) {
    const statusResp = await axios.get(pollingUrl, {
      headers: { authorization: assemblyApiKey },
    });
    const status = statusResp?.data?.status;
    if (status === 'completed') {
      return statusResp.data.text || '';
    }
    if (status === 'error') {
      const errMsg = statusResp?.data?.error || 'Unknown transcription error';
      throw new Error(`AssemblyAI error: ${errMsg}`);
    }
    attempts += 1;
    await sleep(1000);
  }
  throw new Error('AssemblyAI transcription timeout');
}

async function ttsWithMurf(text) {
  const murfApiKey = process.env.MURF_API_KEY;
  if (!murfApiKey) throw new Error('Missing MURF_API_KEY');

  const voiceId = process.env.MURF_VOICE_ID || 'en-US-terrell';
  const format = process.env.MURF_AUDIO_FORMAT || 'MP3';
  const sampleRate = Number(process.env.MURF_SAMPLE_RATE || 24000);

  const resp = await axios.post(
    'https://api.murf.ai/v1/speech/generate',
    {
      text,
      voiceId,
      format,
      sampleRate,
      modelVersion: 'GEN2',
    },
    {
      headers: {
        'content-type': 'application/json',
        'api-key': murfApiKey,
      },
      timeout: 120000,
    }
  );

  const data = resp?.data || {};
  // Murf responses may use either snake_case or camelCase for the audio URL field
  const audioUrl = data.audio_file || data.audioFile || data.audio || data.url;
  if (!audioUrl) {
    throw new Error('Murf response missing audio URL');
  }
  return audioUrl;
}

// POST /tts/echo - accepts multipart/form-data with field "audio"
app.post('/tts/echo', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No audio file uploaded under field "audio"' });
    }

    // 1) Upload to AssemblyAI and transcribe
    const aaiUrl = await uploadToAssemblyAI(req.file.buffer);
    const transcript = await transcribeWithAssemblyAI(aaiUrl);

    if (!transcript || !transcript.trim()) {
      return res.status(422).json({ error: 'Empty transcription' });
    }

    // 2) Generate TTS with Murf
    const murfAudioUrl = await ttsWithMurf(transcript);

    // 3) Return URL (client will play it)
    return res.json({ url: murfAudioUrl, transcript });
  } catch (err) {
    console.error('Error in /tts/echo:', err?.response?.data || err?.message || err);
    const status = err?.response?.status || 500;
    return res.status(status).json({ error: 'Failed to process audio', details: err?.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});