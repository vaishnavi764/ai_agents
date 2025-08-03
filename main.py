from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import httpx
import os
from typing import Optional

app = FastAPI(
    title="TTS Server with Murf API",
    description="A REST API server that converts text to speech using Murf's TTS API",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "en-US-ken"  # Default voice
    rate: Optional[str] = "0"  # Default speech rate
    pitch: Optional[str] = "0"  # Default pitch
    volume: Optional[str] = "0"  # Default volume

class TTSResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    message: str

# Murf API configuration
MURF_API_BASE_URL = "https://api.murf.ai/v1"
MURF_API_KEY = os.getenv("MURF_API_KEY", "your-murf-api-key-here")

@app.get("/")
async def root():
    """Serve the demo HTML page"""
    return FileResponse("static/index.html")

@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "message": "TTS Server with Murf API",
        "docs": "/docs", 
        "tts_endpoint": "/generate-tts",
        "demo": "/"
    }

@app.post("/generate-tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """
    Generate text-to-speech audio using Murf's REST API
    
    Args:
        request: TTSRequest containing text and voice parameters
        
    Returns:
        TTSResponse with audio URL or error message
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Prepare headers for Murf API
    headers = {
        "Authorization": f"Bearer {MURF_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Prepare payload for Murf API
    payload = {
        "text": request.text,
        "voiceId": request.voice_id,
        "rate": request.rate,
        "pitch": request.pitch,
        "volume": request.volume,
        "format": "mp3"  # Audio format
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Call Murf's /generate endpoint
            response = await client.post(
                f"{MURF_API_BASE_URL}/generate",
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Extract audio URL from Murf's response
                # Note: Adjust this based on Murf's actual response structure
                audio_url = result.get("audioFile", result.get("url", result.get("audio_url")))
                
                if audio_url:
                    return TTSResponse(
                        success=True,
                        audio_url=audio_url,
                        message="TTS generation successful"
                    )
                else:
                    return TTSResponse(
                        success=False,
                        message="Audio URL not found in response"
                    )
            
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=401, 
                    detail="Invalid Murf API key. Please check your API credentials."
                )
            elif response.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. Please try again later."
                )
            else:
                error_detail = f"Murf API error: {response.status_code} - {response.text}"
                raise HTTPException(status_code=response.status_code, detail=error_detail)
                
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to Murf API timed out. Please try again."
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Murf API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "TTS server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)