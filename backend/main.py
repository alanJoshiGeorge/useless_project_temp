from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pdfplumber
import io
import re
import base64
import requests
from dotenv import load_dotenv
import os
import time

# Load API key from .env
load_dotenv()
DID_API_KEY = os.getenv("API_KEY")  # should be in format: username:password

if not DID_API_KEY or ":" not in DID_API_KEY:
    raise RuntimeError("API_KEY in .env must be in format 'username:password'")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_resume_sections(text: str):
    sections = {"Name": "", "Summary": "", "Experience": "", "Education": "", "Skills": ""}
    current_section = "Summary"
    lines = text.splitlines()
    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue
        elif re.search(r"\b(experience|work)\b", clean_line, re.I):
            current_section = "Experience"
        elif re.search(r"\b(education|qualification)\b", clean_line, re.I):
            current_section = "Education"
        elif re.search(r"\b(skill)\b", clean_line, re.I):
            current_section = "Skills"
        elif not sections["Name"]:
            sections["Name"] = clean_line
        else:
            sections[current_section] += clean_line + " "
    return sections


def create_speaking_script(sections):
    return f"""
Hi, I’m {sections.get("Name", sections["Name"])}. I would like to introduce myself.
Here's a quick summary: {sections.get("Summary", "")}
I have experience in {sections.get("Experience", "")}
I studied at: {sections.get("Education", "")}
And I have skills including: {sections.get("Skills", "")}
Thanks for watching!
"""


def call_did_api(image_bytes: bytes, script: str):
    url = "https://api.d-id.com/talks"

    # Basic Auth headers
    creds_b64 = base64.b64encode(DID_API_KEY.encode()).decode("utf-8")
    headers = {
        "Authorization": f"Basic {creds_b64}",
        "Content-Type": "application/json"
    }

    # Base64 encode image
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "script": {
            "type": "text",
            "provider": {"type": "microsoft", "voice_id": "en-US-JennyNeural"},
            "ssml": False,
            "input": script
        },
        "source_image": image_b64
    }

    # Step 1: Initiate talk
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 201:
        raise Exception(f"D-ID Error: {response.status_code} {response.text}")

    talk_id = response.json().get("id")
    poll_url = f"https://api.d-id.com/talks/{talk_id}"

    # Step 2: Poll for result
    for _ in range(30):  # wait up to 60 seconds
        poll_response = requests.get(poll_url, headers=headers)
        data = poll_response.json()
        if data.get("status") == "done":
            return data.get("result_url")
        time.sleep(2)

    raise TimeoutError("Video generation timed out.")


@app.post("/generate-avatar")
async def generate_avatar(resume: UploadFile = File(...), photo: UploadFile = File(...)):
    try:
        resume_bytes = await resume.read()
        photo_bytes = await photo.read()

        # Extract text from PDF resume
        with pdfplumber.open(io.BytesIO(resume_bytes)) as pdf:
            text = "" 
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        if not text.strip():
            return JSONResponse({"message": "Could not extract text from resume."}, status_code=400)

        sections = parse_resume_sections(text)
        script = create_speaking_script(sections)

        video_url = call_did_api(photo_bytes, script)

        if not video_url:
            return JSONResponse({"message": "D-ID video generation failed."}, status_code=500)

        print("✅ Final video URL:", video_url)
        return {"video_url": video_url, "script": script}

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
