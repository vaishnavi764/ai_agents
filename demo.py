#!/usr/bin/env python3
"""
Demo script to test the TTS API endpoint
"""

import httpx
import json
import asyncio
import os

BASE_URL = "http://localhost:8000"

async def test_endpoint(text: str, voice_id: str = "en-US-ken"):
    """Test the TTS endpoint with given text"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/generate-tts",
                json={
                    "text": text,
                    "voice_id": voice_id,
                    "rate": "0",
                    "pitch": "0",
                    "volume": "0"
                },
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return response.json()
            
        except Exception as e:
            print(f"Error: {e}")
            return None

async def main():
    """Run demo tests"""
    print("=== TTS API Demo ===\n")
    
    # Test 1: Basic health check
    print("1. Testing health endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.json()}\n")
    
    # Test 2: Simple TTS request
    print("2. Testing TTS with simple text...")
    await test_endpoint("Hello, this is a test of the TTS API.")
    print()
    
    # Test 3: Longer text
    print("3. Testing TTS with longer text...")
    long_text = "Welcome to our text-to-speech demonstration. This API integrates with Murf to convert your text into high-quality audio files."
    await test_endpoint(long_text)
    print()
    
    # Test 4: Different voice (if available)
    print("4. Testing with different voice...")
    await test_endpoint("This is a test with a different voice setting.", "en-US-sarah")
    print()
    
    print("=== Demo Complete ===")
    print("Note: 404 errors are expected if you haven't configured a valid Murf API key.")
    print("To use with a real API key, set the MURF_API_KEY environment variable.")

if __name__ == "__main__":
    asyncio.run(main())