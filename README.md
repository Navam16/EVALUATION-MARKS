# 🏛️ Class Participation Evaluator v2.0
**React (Vercel) + FastAPI (Render) · Transcript & Audio Evaluation**

---

## ✨ What's New in v2.0
- **Audio Submission Mode** — Students upload MP3/WAV/M4A files
- Groq Whisper transcribes audio → LLaMA evaluates 8 dimensions
- 3 speech-specific factors: Fluency, Confidence, Vocabulary Depth
- Grade recommendation (A / B+ / B / C+ / C / D)
- Filler word detection, word count, full transcription viewer

---

## 📁 Project Structure

```
participation-evaluator/
├── backend/
│   ├── main.py            ← FastAPI app (transcript + audio endpoints)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx        ← Full React UI
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── render.yaml            ← Render deployment config
├── vercel.json            ← Vercel deployment config
└── README.md
```

---

## 🚀 Deployment

### Step 1 — Deploy Backend to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable:
   - `GROQ_API_KEY` = your key from [console.groq.com](https://console.groq.com)
6. Deploy → note the URL: `https://your-service.onrender.com`

### Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Import Project
2. Connect your GitHub repo
3. Settings:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-service.onrender.com`
5. Deploy!

---

## 🖥️ Local Development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=gsk_...
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm install
# create .env from .env.example (VITE_API_URL=http://localhost:8000)
npm run dev
```

---

## 🔌 API Reference

### `POST /api/analyse/transcript`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | `.vtt` or `.txt` transcript |
| `professor_name` | string | Professor's name to exclude from evaluation |

Returns: Full JSON with `professor_dashboard` + `student_evaluations[]`

### `POST /api/analyse/audio`
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`, `.flac` |
| `student_name` | string | Student's name |
| `topic_context` | string | Assignment or class topic |

Returns: 8-factor evaluation JSON with transcription, grade, filler words

### `GET /api/health`
Returns: `{ "status": "ok", "version": "2.0.0" }`

---

## 📊 Evaluation Dimensions

### Transcript Mode (5 factors)
| Factor | Description |
|--------|-------------|
| Relevance | On-topic, pertinent contributions |
| Knowledgeability | Depth of subject understanding |
| Engagement | Active, consistent participation |
| Critical Thinking | Analysis, questioning, reasoning |
| Communication | Clarity and articulation |

### Audio Mode (8 factors = 5 standard + 3 speech-specific)
| Additional Factor | Description |
|------------------|-------------|
| Fluency | Smooth delivery, minimal filler words |
| Confidence | Assertive tone, steady pace |
| Vocabulary Depth | Richness, domain-specificity |

---

## 🔑 Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| `GROQ_API_KEY` | Render | From console.groq.com |
| `VITE_API_URL` | Vercel | Your Render backend URL |
