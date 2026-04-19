"""
Class Participation Evaluator — FastAPI Backend
================================================
Endpoints:
  POST /api/analyse/transcript  — analyse .vtt / .txt transcript
  POST /api/analyse/audio       — transcribe audio then analyse
  GET  /api/health              — health check
"""

import io
import json
import os
import re
import tempfile
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

app = FastAPI(title="Class Participation Evaluator API", version="2.0.0")

# ── CORS (allow Vercel frontend + local dev) ──────────────────────────────────
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://*.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in prod to ALLOWED_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq client ───────────────────────────────────────────────────────────────
def get_client() -> Groq:
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server.")
    return Groq(api_key=key)


# ── Transcript cleaner ────────────────────────────────────────────────────────
def clean_transcript(raw: str) -> str:
    text = re.sub(r"^WEBVTT.*?\n\n", "", raw, flags=re.DOTALL)
    text = re.sub(r"\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}", "", text)
    text = re.sub(r"^\d+\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── LLM prompts ───────────────────────────────────────────────────────────────
TEXT_SYSTEM = """
You are an expert educational analyst specialising in higher-education participation assessment.
You will receive a transcript from an online class session.

The professor in this session is: {professor_name}

Evaluate every student (anyone who spoke other than the professor) across FIVE research-backed factors:

1. relevance          (1-10) — How on-topic and pertinent were the student's contributions?
2. knowledgeability   (1-10) — How deeply did the student demonstrate subject understanding?
3. engagement         (1-10) — How actively, consistently, and enthusiastically did the student participate?
4. critical_thinking  (1-10) — Did the student analyse, question, reason, or build on ideas critically?
5. communication      (1-10) — How clearly, articulately, and confidently did the student express themselves?

Return ONLY a valid JSON object (no markdown fences, no explanation) with EXACTLY this structure:

{
  "professor_dashboard": {
    "overall_class_understanding": "<2-4 sentence summary>",
    "topics_to_review": ["<topic 1>", "<topic 2>"],
    "teaching_feedback": "<Specific, constructive advice for the professor>",
    "question_mapping": [
      {
        "professor_question": "<exact or paraphrased question>",
        "students_who_answered": ["<Student Name>"]
      }
    ]
  },
  "student_evaluations": [
    {
      "name": "<Student Name>",
      "scores": {
        "relevance":         0,
        "knowledgeability":  0,
        "engagement":        0,
        "critical_thinking": 0,
        "communication":     0
      },
      "feedback": {
        "strengths":         "<What the student did well>",
        "weaknesses":        "<Where the student fell short>",
        "needs_improvement": "<One or two specific, actionable improvement steps>"
      }
    }
  ]
}

Rules:
- Only include students who actually spoke (exclude the professor).
- All scores must be integers 1-10.
- topics_to_review: concepts students seemed confused about.
- Return ONLY the JSON — no markdown, no preamble.
"""

AUDIO_SYSTEM = """
You are an expert educational analyst specialising in speech-based participation assessment.
You will receive an auto-transcribed audio submission from a single student.

Student name: {student_name}
Assignment/Topic context: {topic_context}

Evaluate this student across EIGHT dimensions — five standard participation factors PLUS three
speech-quality factors that are only measurable from audio:

Standard factors:
1. relevance          (1-10) — On-topic, pertinent content
2. knowledgeability   (1-10) — Depth of subject understanding
3. engagement         (1-10) — Enthusiasm, energy, effort shown
4. critical_thinking  (1-10) — Analysis, reasoning, questioning
5. communication      (1-10) — Overall clarity and articulation

Audio-specific factors:
6. fluency            (1-10) — Smooth delivery, sentence completion, minimal filler words (um, uh, like)
7. confidence         (1-10) — Assertive tone, minimal hedging, steady pace
8. vocabulary_depth   (1-10) — Richness, precision, and domain-specificity of word choice

Return ONLY a valid JSON object with EXACTLY this structure:

{
  "student_name": "<name>",
  "topic": "<topic_context>",
  "transcription_snippet": "<first 200 chars of what was said>",
  "scores": {
    "relevance":         0,
    "knowledgeability":  0,
    "engagement":        0,
    "critical_thinking": 0,
    "communication":     0,
    "fluency":           0,
    "confidence":        0,
    "vocabulary_depth":  0
  },
  "overall_score": 0.0,
  "feedback": {
    "strengths":         "<What the student did well>",
    "weaknesses":        "<Where the student fell short>",
    "needs_improvement": "<Two specific, actionable improvement steps>",
    "speech_notes":      "<Specific observations about delivery, pacing, filler words, tone>"
  },
  "filler_words_detected": ["um", "uh"],
  "estimated_word_count": 0,
  "grade_recommendation": "<A / B+ / B / C+ / C / D>"
}

Rules:
- All scores must be integers 1-10.
- overall_score = average of all 8 scores, rounded to 1 decimal.
- grade_recommendation based on overall_score: 9-10=A, 8-8.9=B+, 7-7.9=B, 6-6.9=C+, 5-5.9=C, <5=D
- Return ONLY the JSON — no markdown, no preamble.
"""


def parse_llm_json(raw: str) -> dict:
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    return json.loads(raw)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/analyse/transcript")
async def analyse_transcript(
    file: UploadFile = File(...),
    professor_name: str = Form(default="the professor"),
):
    content = await file.read()
    raw_text = content.decode("utf-8", errors="replace")
    clean    = clean_transcript(raw_text)

    if len(clean) < 50:
        raise HTTPException(status_code=400, detail="Transcript too short or unreadable.")

    client  = get_client()
    system  = TEXT_SYSTEM.format(professor_name=professor_name or "the professor")

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Here is the class transcript:\n\n{clean}"},
        ],
        temperature=0.3,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    try:
        result = parse_llm_json(resp.choices[0].message.content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")

    return result


@app.post("/api/analyse/audio")
async def analyse_audio(
    file: UploadFile = File(...),
    student_name: str = Form(default="Student"),
    topic_context: str = Form(default="General class participation"),
):
    content = await file.read()

    # ── Step 1: Transcribe with Groq Whisper ──
    client = get_client()

    suffix = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=audio_file,
                response_format="text",
                language="en",          # supports hi/en code-switch too
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper transcription failed: {e}")
    finally:
        os.unlink(tmp_path)

    transcript_text = transcription if isinstance(transcription, str) else transcription.text

    if not transcript_text or len(transcript_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Audio too short or inaudible — could not transcribe.")

    # ── Step 2: Evaluate transcription with LLaMA ──
    system = AUDIO_SYSTEM.format(
        student_name=student_name or "Student",
        topic_context=topic_context or "General class participation",
    )

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Here is the transcribed audio:\n\n{transcript_text}"},
        ],
        temperature=0.3,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    try:
        result = parse_llm_json(resp.choices[0].message.content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")

    result["full_transcription"] = transcript_text
    return result
