# Audio Transcription Server

A complete audio transcription solution using OpenAI Whisper for server-side transcription. This application allows users to record audio or upload audio files and get real-time transcriptions.

## Features

- 🎤 **Real-time Audio Recording**: Record audio directly in the browser
- 📁 **File Upload**: Support for various audio formats (WAV, MP3, MP4, M4A, OGG, FLAC, WebM)
- 🔤 **AI Transcription**: Powered by OpenAI Whisper for accurate transcription
- 🌐 **Modern UI**: Beautiful, responsive web interface
- ⚡ **Fast Processing**: Efficient server-side transcription
- 🔍 **Language Detection**: Automatic language detection

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Server

```bash
python server.py
```

The server will start on `http://localhost:5000`

### 3. Open the Web Interface

Open `index.html` in your web browser or serve it with a simple HTTP server:

```bash
# Option 1: Open directly in browser
open index.html

# Option 2: Use Python's built-in server
python -m http.server 8080
# Then visit http://localhost:8080
```

## API Endpoints

### `/transcribe/file` (POST)
Transcribes an uploaded audio file.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Audio file in the `file` field

**Response:**
```json
{
  "transcription": "The transcribed text",
  "language": "en",
  "filename": "recording.wav",
  "status": "success"
}
```

### `/upload` (POST)
Legacy endpoint for file upload (for backward compatibility).

### `/health` (GET)
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "whisper_model": "base"
}
```

## Supported Audio Formats

- WAV
- MP3
- MP4
- M4A
- OGG
- FLAC
- WebM

## Usage

1. **Recording Audio**: Click the red microphone button to start recording, then click the stop button when finished.

2. **Uploading Files**: Click "Choose Audio File" to select an audio file from your device.

3. **Transcription**: Click "Transcribe Audio" to send the audio to the server for transcription.

4. **Results**: The transcribed text will appear in the results area below.

## Technical Details

- **Backend**: Flask with OpenAI Whisper
- **Frontend**: Pure HTML/CSS/JavaScript
- **Model**: Whisper "base" model (can be changed in `server.py`)
- **File Limits**: 16MB maximum file size
- **CORS**: Enabled for cross-origin requests

## Troubleshooting

### Server Issues
- Make sure all dependencies are installed: `pip install -r requirements.txt`
- Check that port 5000 is available
- Verify Whisper model is downloading correctly (first run may take time)

### Browser Issues
- Ensure microphone permissions are granted
- Use HTTPS for microphone access in production
- Check browser compatibility for MediaRecorder API

### Audio Issues
- Verify audio file format is supported
- Check file size is under 16MB
- Ensure audio file is not corrupted

## Development

To modify the Whisper model, edit the model loading line in `server.py`:

```python
model = whisper.load_model("base")  # Options: tiny, base, small, medium, large
```

Larger models provide better accuracy but require more computational resources.

## License

This project is licensed under the MIT License - see the LICENSE file for details.