import json
import sys
import requests
import os
from dotenv import load_dotenv

url = "https://shazam-api6.p.rapidapi.com/shazam/recognize/"

audio_data = sys.stdin.buffer.read()

files = {
    "upload_file": ("audio_file.mp3", audio_data, "audio/mpeg")
}

headers = {
    "x-rapidapi-key": os.getenv("X_RAPIDAPI_KEY"), 
    "x-rapidapi-host": "shazam-api6.p.rapidapi.com",
}

try:
    response = requests.post(url, files=files, headers=headers)
    response.raise_for_status()
    result = response.json()

    data = {
        "title": result["track"]["title"],
        "artist": result["track"]["subtitle"]
    }
    print(json.dumps(data))

except Exception as e:
    print(json.dumps({ "error": "Track not found"}))