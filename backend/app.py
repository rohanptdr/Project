
import os
import json
import asyncio
from io import BytesIO

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI(
    title="Construction Intelligence Platform",
    description="AI-powered construction site analysis API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("GEMINI_API_KEY")


@app.get("/")
def home():
    return {
        "message": "Construction Intelligence Platform API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Construction Intelligence Platform",
        "ai_configured": bool(API_KEY)
    }


def analyze_site_image(image, mime_type):
    client = genai.Client(api_key=API_KEY)

    prompt = """
    Analyze this construction-site photo for visible worker safety issues.

    Look for:
    - Hard hats or safety helmets
    - High-visibility safety vests
    - Safety harnesses when working at height
    - Visible hazards such as exposed edges, unsafe access,
      missing barriers, or clutter

    Do not claim an item is missing if the image does not clearly show
    the relevant worker or body area. Use "uncertain" when unclear.
    Do not claim to detect steel-toe boots unless they are visible.

    Return JSON only, using this exact structure:
    {
      "safety_score": 0,
      "overall_status": "Review Required",
      "workers_observed": 0,
      "ppe_checklist": [
        {
          "item": "Helmet",
          "status": "observed, missing, or uncertain",
          "evidence": "Brief visual explanation"
        }
      ],
      "hazards": [
        {
          "hazard": "Description",
          "severity": "low, medium, high, or uncertain",
          "recommendation": "Suggested precaution"
        }
      ],
      "summary": "Short summary of visible evidence",
      "limitations": "Mention anything the image cannot establish"
    }

    Score visible evidence only. Do not invent worker counts or hazards.
    A human safety professional must verify the findings.
    """

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[prompt, image],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2
        )
    )

    if not response.text:
        raise ValueError("The AI returned an empty response.")

    return json.loads(response.text)


@app.post("/api/safety/analyze")
async def analyze_safety(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG or PNG image."
        )

    contents = await file.read()

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB."
        )

    try:
        image = Image.open(BytesIO(contents))
        image.load()

        if image.format not in ("JPEG", "PNG"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid JPG or PNG."
            )

        image = image.convert("RGB")

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured in the backend .env file."
        )

    try:
        analysis = await asyncio.to_thread(
            analyze_site_image,
            image,
            file.content_type
        )

        return {
            "filename": file.filename,
            "status": "analysis_completed",
            "message": "AI safety review completed. Verify findings manually.",
            "analysis": analysis
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="The AI returned an invalid JSON response. Please retry."
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                "AI analysis failed. Check the backend Terminal for details, "
                "your API key, model access, and API quota."
            )
        )
