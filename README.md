# TTS Server with Murf API

A FastAPI-based REST server that provides text-to-speech functionality using Murf's TTS API.

## Features

- RESTful API for text-to-speech conversion
- Integration with Murf's TTS API
- Configurable voice parameters (voice ID, rate, pitch, volume)
- Interactive API documentation with FastAPI
- Error handling and validation
- Health check endpoint

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Murf API key:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Murf API key
   ```

3. **Run the server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### POST /generate-tts
Converts text to speech using Murf's API.

**Request Body:**
```json
{
  "text": "Hello, this is a test message",
  "voice_id": "en-US-ken",
  "rate": "0",
  "pitch": "0",
  "volume": "0"
}
```

**Response:**
```json
{
  "success": true,
  "audio_url": "https://example.com/audio.mp3",
  "message": "TTS generation successful"
}
```

### GET /health
Health check endpoint.

### GET /
Root endpoint with basic information.

## Testing

1. **Start the server:**
   ```bash
   python main.py
   ```

2. **Access interactive documentation:**
   Open your browser and go to `http://localhost:8000/docs`

3. **Test the endpoint:**
   Use the FastAPI docs interface to test the `/generate-tts` endpoint, or use curl:
   ```bash
   curl -X POST "http://localhost:8000/generate-tts" \
        -H "Content-Type: application/json" \
        -d '{"text": "Hello, this is a test message"}'
   ```

## Configuration

- `MURF_API_KEY`: Your Murf API key (required)
- `MURF_API_BASE_URL`: Murf API base URL (optional, defaults to https://api.murf.ai/v1)

## Voice Parameters

- `voice_id`: Voice identifier (default: "en-US-ken")
- `rate`: Speech rate (default: "0")
- `pitch`: Voice pitch (default: "0") 
- `volume`: Audio volume (default: "0")

## Error Handling

The API includes comprehensive error handling for:
- Invalid API keys (401)
- Rate limiting (429)
- Network timeouts (504)
- Connection errors (503)
- Invalid input (400)
- Internal server errors (500)