import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup for file uploads (store in memory for quick pass-through)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, whisperConfigured: Boolean(process.env.OPENAI_API_KEY), murfConfigured: Boolean(process.env.MURF_API_KEY) });
});

// Transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded. Use form field name "audio".' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Write buffer to a temp file because OpenAI SDK expects a file/stream
    const tempDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempPath = path.join(tempDir, `upload_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, req.file.buffer);

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: process.env.WHISPER_MODEL || 'whisper-1',
        // language: 'en' // optionally fix language
      });

      res.json({ text: transcription.text || transcription?.data?.text || '' });
    } finally {
      // Cleanup temp file
      fs.unlink(tempPath, () => {});
    }
  } catch (err) {
    console.error('Transcription error:', err?.response?.data || err);
    res.status(500).json({ error: 'Transcription failed', details: err?.message || String(err) });
  }
});

// Murf TTS endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const murfApiKey = process.env.MURF_API_KEY;
    if (!murfApiKey) {
      return res.status(500).json({ error: 'MURF_API_KEY not configured' });
    }

    const { text, voiceId, format } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const chosenVoice = voiceId || process.env.MURF_VOICE_ID || 'en-US-natalie';
    const chosenFormat = (format || process.env.MURF_AUDIO_FORMAT || 'MP3').toUpperCase();

    const url = 'https://api.murf.ai/v1/speech/generate-with-key';
    const payload = { text, voiceId: chosenVoice, format: chosenFormat };

    const murfResp = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': murfApiKey,
      },
      timeout: 60_000,
    });

    // Expecting audioFile URL in response
    const audioFileUrl = murfResp?.data?.audioFile;
    if (!audioFileUrl) {
      return res.status(502).json({ error: 'Murf did not return audioFile', murfResponse: murfResp.data });
    }

    const audioResp = await axios.get(audioFileUrl, { responseType: 'arraybuffer', timeout: 60_000 });

    // Infer content-type from format
    const contentType = chosenFormat === 'MP3' ? 'audio/mpeg' : chosenFormat === 'WAV' ? 'audio/wav' : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="murf-tts.' + (chosenFormat === 'WAV' ? 'wav' : 'mp3') + '"');
    return res.send(Buffer.from(audioResp.data));
  } catch (err) {
    console.error('Murf TTS error:', err?.response?.data || err);
    res.status(500).json({ error: 'TTS failed', details: err?.message || String(err) });
  }
});

// Single-step: audio -> whisper -> murf -> return audio bytes
app.post('/api/echo-murf', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }
    if (!process.env.MURF_API_KEY) {
      return res.status(500).json({ error: 'MURF_API_KEY not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded. Use form field name "audio".' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Save to temp
    const tempDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempPath = path.join(tempDir, `upload_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, req.file.buffer);

    let text = '';
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: process.env.WHISPER_MODEL || 'whisper-1',
      });
      text = transcription.text || transcription?.data?.text || '';
    } finally {
      fs.unlink(tempPath, () => {});
    }

    if (!text) {
      return res.status(422).json({ error: 'Empty transcription' });
    }

    // Call Murf
    const voiceId = (req.query.voiceId || process.env.MURF_VOICE_ID || 'en-US-natalie');
    const format = ((req.query.format || process.env.MURF_AUDIO_FORMAT || 'MP3') + '').toUpperCase();
    const murfPayload = { text, voiceId, format };
    const murfResp = await axios.post('https://api.murf.ai/v1/speech/generate-with-key', murfPayload, {
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.MURF_API_KEY },
      timeout: 60_000,
    });

    const audioFileUrl = murfResp?.data?.audioFile;
    if (!audioFileUrl) {
      return res.status(502).json({ error: 'Murf did not return audioFile', murfResponse: murfResp.data });
    }

    const audioResp = await axios.get(audioFileUrl, { responseType: 'arraybuffer', timeout: 60_000 });
    const contentType = format === 'MP3' ? 'audio/mpeg' : format === 'WAV' ? 'audio/wav' : 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="echo-murf.' + (format === 'WAV' ? 'wav' : 'mp3') + '"');
    return res.send(Buffer.from(audioResp.data));
  } catch (err) {
    console.error('Echo Murf error:', err?.response?.data || err);
    res.status(500).json({ error: 'Echo Murf failed', details: err?.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});