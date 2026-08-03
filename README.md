# Agentic Trainer

An enterprise knowledge assistant that learns from SME training videos, PDFs, SOPs, DOCX files,
manuals, and FAQs — answers questions naturally, cites its sources precisely, refuses to
hallucinate when evidence is insufficient, and improves over time through an SME-gated feedback
loop.

Built as a multi-agent pipeline (11 agents) orchestrated with LangGraph, using local models
(Gemma 3 via Ollama, BAAI/bge-base-en-v1.5 embeddings) so no data leaves your machine.

---

## Architecture

```
Documents (PDF/DOCX/TXT/FAQ/Video)
        │
        ▼
  Ingestion Agent  ──►  Cleaning Agent  ──►  Chunking Agent  ──►  Embedding Agent  ──►  ChromaDB
                                                                                            │
                                                                                            ▼
Question ──► Intent Agent ──► Retrieval Agent (hybrid BM25+vector) ──► Verification Agent
                                                                              │
                                                    ┌─────────────────────────┴───────────────┐
                                                    ▼                                          ▼
                                          sufficient evidence                       insufficient evidence
                                                    │                                          │
                                            Reasoning Agent (Gemma 3)                "I couldn't find this
                                                    │                                 in the enterprise
                                            Citation Agent                            knowledge."
                                                    │
                                                 Answer
                                                    │
                                            👍 / 👎 Feedback Agent
                                                    │
                                          SME Validation Agent (admin panel)
                                                    │
                                          Approved corrections re-embedded
                                          into the knowledge base
```

See `agents/*.py` — each of the 11 agents from the design doc is its own module with a docstring
explaining its responsibility and design decisions.

---

## Prerequisites

| Requirement | Why | Install |
|---|---|---|
| Python 3.10+ | Runtime | — |
| [Ollama](https://ollama.com) | Runs Gemma 3 locally for reasoning + intent classification | `curl -fsSL https://ollama.com/install.sh \| sh` (Linux/Mac) or download for Windows |
| ffmpeg | Required by Whisper for video/audio transcription | `sudo apt install ffmpeg` (Linux), `brew install ffmpeg` (Mac) |
| Tesseract OCR | Fallback text extraction for scanned PDF pages | `sudo apt install tesseract-ocr` (Linux), `brew install tesseract` (Mac) |

After installing Ollama:

```bash
ollama serve                # starts the local Ollama server (leave running)
ollama pull gemma3          # downloads the Gemma 3 model (one-time, several GB)
```

---

## Installation

```bash
git clone <this-repo>
cd agentic_trainer

python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env        # then edit .env if you want non-default settings
```

The first time you run the app, two more downloads happen automatically (no action needed, just
expect a delay and an internet connection the first time):
- `sentence-transformers` downloads the `BAAI/bge-base-en-v1.5` embedding model (~440MB)
- `openai-whisper` downloads its model weights the first time you ingest a video file

---

## Running the app

You need **two processes running at once**, in two terminals:

**Terminal 1 — backend API:**
```bash
uvicorn app.api:app --reload --port 8000
```

**Terminal 2 — frontend UI:**
```bash
streamlit run app/frontend/streamlit_app.py
```

Then open the URL Streamlit prints (usually `http://localhost:8501`).

---

## Using it

1. **Add knowledge** — in the sidebar, upload a PDF, DOCX, TXT/FAQ file, or video. Click "Index
   this file". A few sample files are already in `knowledge/` to try immediately.
2. **Ask questions** — type in the chat box. Answers come with an expandable "Sources" section
   showing exact page/section/timestamp citations.
3. **Give feedback** — 👍/👎 each answer. Thumbs-down prompts you for what should have been said.
4. **SME review** — switch to "Admin (SME Review)" in the sidebar to see the queue of pending
   corrections. Approve or reject each one, then click "Re-index approved corrections" to fold
   approved fixes back into the knowledge base.

---

## Testing ingestion/agents directly (no UI needed)

Every agent is independently testable from a Python shell:

```python
from app.pipeline import AgenticTrainerPipeline

pipeline = AgenticTrainerPipeline()
pipeline.ingest_and_index("knowledge/sop/cpi_sop.docx")

result, feedback_id = pipeline.ask("How do I create an iFlow?")
print(result.answer)
print([c.locator for c in result.citations])
```

Individual agents can also be unit-tested in isolation — see `app/agents/*.py`; most accept an
injectable model/client so you can substitute a stub in tests without needing Ollama or a
downloaded embedding model running.

---

## Configuration

All tunable settings live in `.env` (copy from `.env.example`). Key ones:

| Setting | Default | Effect |
|---|---|---|
| `OLLAMA_MODEL` | `gemma3` | Which local model handles reasoning + intent classification |
| `EMBEDDING_MODEL` | `BAAI/bge-base-en-v1.5` | Swap to `nomic-ai/nomic-embed-text-v1.5` if preferred |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `500` / `100` | Chunking granularity |
| `RETRIEVAL_TOP_K` | `5` | How many chunks to retrieve per question |
| `HYBRID_ALPHA` | `0.5` | 0 = keyword-only search, 1 = vector-only, 0.5 = balanced |
| `MIN_CONTEXT_CHUNKS` / `MIN_RELEVANCE_SCORE` | `2` / `0.35` | Anti-hallucination gate thresholds — raise these to make the system more conservative about refusing |
| `WHISPER_MODEL_SIZE` | `base` | Larger = more accurate transcription, slower |

---

## Project structure

```
agentic_trainer/
├── app/
│   ├── main.py                 # (reserved — API entrypoint is api.py)
│   ├── config.py               # Central settings, loaded from .env
│   ├── api.py                  # FastAPI endpoints
│   ├── pipeline.py             # LangGraph orchestration wiring all agents together
│   ├── agents/                 # One file per agent (see architecture diagram above)
│   ├── database/
│   │   ├── chroma.py           # Vector store wrapper
│   │   └── sqlite.py           # Feedback/validation storage
│   ├── services/
│   │   └── llm_client.py       # Shared Ollama client
│   ├── utils/
│   │   ├── logger.py
│   │   └── schemas.py          # Shared data models passed between agents
│   └── frontend/
│       └── streamlit_app.py    # Chat UI + admin review panel
├── knowledge/                  # Drop source files here (pdf/videos/faq/sop subfolders)
├── chroma_data/                # ChromaDB persistent storage (auto-created)
├── feedback.db                 # SQLite feedback/validation store (auto-created)
├── requirements.txt
└── .env.example
```

---

## Known limitations / what to check first if something doesn't work

- **"Failed to reach Ollama"** — make sure `ollama serve` is running in a separate terminal and
  `ollama pull gemma3` has completed.
- **First `/ask` or `/upload` call is slow** — the embedding model download happens on first use;
  subsequent calls are fast.
- **Video ingestion is slow on CPU** — Whisper is compute-heavy. A GPU machine is strongly
  recommended if video is a significant part of your corpus; for demo purposes, keep sample
  videos short (under a few minutes).
- **BM25 index staleness** — the keyword index rebuilds from whatever's currently in ChromaDB on
  the next retrieval call after any re-indexing; no action needed, just note there's a small
  rebuild cost right after adding new documents.

---

## Suggested next steps for scaling to production

- Swap ChromaDB's `PersistentClient` for a hosted/clustered vector DB (Qdrant, pgvector, Pinecone)
  if the corpus grows large or needs multi-instance access.
- Add authentication (Keycloak/Auth0) and role-based access (Admin/SME/Employee) in front of the
  FastAPI layer.
- Containerize (`Dockerfile` + `docker-compose.yml` covering the API, Streamlit, and Ollama) for
  reproducible deployment to a cloud VM.
- Add conversation memory so multi-turn follow-up questions retain context.
- Add an evaluation harness (faithfulness, context precision, answer relevance) to track answer
  quality over time as the knowledge base grows.
