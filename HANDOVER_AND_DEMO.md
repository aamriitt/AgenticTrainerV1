# Handover and demo guide

Use this file in two settings:

1. **TCS associate handover** — walk the use cases, then walk the code in the order below.
2. **Team demo** — almost no slides. Show the running product, then open 6–8 files to prove how it is built.

**Product:** Atlas (Agentic Trainer) — enterprise Q&A over runbooks, plus RebootX tech-refresh risk scoring.  
**Branch on origin:** `feature/rebootx-tech-refresh`  
**Repo:** https://github.com/aamriitt/AgenticTrainerV1

Companion files (do not duplicate them in a PPT):

- `Flow.md` — exact call order
- `decisions.md` — why JWT, LangGraph, hybrid search, RebootX-as-module
- `Overview/` — original design spec (some of it is still ahead of the code)

---

## 0. What to say in 90 seconds (team demo opener)

**Problem.** SME knowledge sits in SOPs, runbooks, and KT notes. Search returns links. Chatbots hallucinate. Upgrade reviews wait on a few experts.

**What we built.** Two live capabilities in one app:

| Capability | User job | What the system does |
| --- | --- | --- |
| **Ask Atlas** | “What is the P1 response time?” | Retrieve from indexed runbooks, refuse if evidence is weak, cite sources |
| **Tech refresh (RebootX)** | “Python 3.9 → 3.12 — is this safe?” | Score risk Low–Critical, list mitigations, optional HTML/PDF report |

**How we built it.** Python FastAPI + LangGraph agents + Chroma + local Ollama. Vite/React UI. JWT for user vs admin. RebootX was a separate prototype; it now runs as a module inside this API.

**How long.** Design docs from late July. Working RAG pipeline in Python by early August. Atlas UI existed as a mostly-mocked shell. **Live wiring + runbooks + auth: ~4 working days (10–14 Aug).** **RebootX folded into the same app: one day (14 Aug).** This is a pilot, not a production SSO/CMDB platform.

Then stop talking and run the demo.

---

## 1. Start the demo (do this before anyone sits down)

Three terminals. If port 8000 is already bound, use the running API.

```powershell
# Terminal 1
$env:OLLAMA_ORIGINS="*"
ollama serve

# Terminal 2
cd "C:\Coding Practice\Agentic-TrainerV1"
.\venv\Scripts\activate
uvicorn app.api:app --host 127.0.0.1 --port 8000

# Terminal 3
npm run dev
```

Checks:

- http://127.0.0.1:8000/health — `status: ok`, `vectors_stored` ~247, `rebootx_documents` ~26
- UI: http://localhost:5173/

Demo logins (seeded in `app/auth.py`, not a real IdP):

| Role | Email | Password |
| --- | --- | --- |
| User | `user@company.com` | `User123!` |
| Admin | `admin@company.com` | `Admin123!` |

If `.env` still has `OLLAMA_MODEL=gemma3` and the machine OOMs, switch to `llama3` and restart uvicorn.

---

## 2. Use cases (handover + demo script)

Say **live** or **shell** out loud so TCS does not think pipeline monitors are production telemetry.

### UC-1 — Role-based sign-in (live)

**Story:** An analyst and an admin must not see the same surfaces.

1. Open `/login/user` → user credentials → Dashboard.
2. Confirm sidebar has Ask Atlas, Tech refresh, Repository, Upload, History. No Admin / Pipeline / Agents / Analytics.
3. Log out. `/login/admin` → admin credentials. Those admin items appear.

**What to claim:** JWT in the API (`app/auth.py`), plus a route guard in `src/layouts/app-layout.tsx`. Not SSO.

**Code to open:** `app/auth.py` (`USERS`, `create_access_token`, `require_admin`) → `src/pages/login-page.tsx` → `src/services/auth.service.ts`.

### UC-2 — Grounded Q&A from a runbook (live) — hero demo

**Story:** Support analyst needs P1 SLA without opening SharePoint.

In **Ask Atlas**, type:

> What is the P1 response time in the incident triage runbook?

Expect: **15 minutes** initial response, **4 hours** resolution, citations, confidence.

Follow-up:

> Who owns authentication incidents and who do we escalate to?

Expect: Identity team / SSO vendor (from the same runbook).

**What to claim:** Hybrid retrieval (vector + BM25) then a **verification gate**. The LLM only sees chunks if evidence is sufficient.

**Code to open:** `app/pipeline.py` `_build_query_graph` (the graph on the whiteboard) → `app/agents/retrieval.py` → `app/agents/verification.py` → `app/agents/reasoning.py`.

### UC-3 — Refuse to hallucinate (live) — do not skip

Type:

> What is the capital of France?

Expect: *I couldn't find this in the enterprise knowledge.*

**What to claim:** This is the product promise. Verification routes to `_node_refuse`, not to Ollama. Show `app/pipeline.py` `_route_after_verification`.

### UC-4 — Upload new knowledge and ask it (live)

1. **Upload center** — drop a small `.txt` with one invented fact (e.g. “Rollback window for billing is 30 minutes”).
2. Wait for `chunks_indexed` > 0.
3. Ask Atlas that fact.

**Code:** `src/services/upload.service.ts` → `app/api.py` `upload_file` → `ingest_and_index` in `app/pipeline.py` (ingest → clean → chunk → embed → Chroma). Linear function, **not** LangGraph.

Upload **queue list** on that page is still mock. The actual file ingest is live.

### UC-5 — SME-gated correction (live)

1. On an Atlas answer, thumbs-down and type a correction.
2. Log in as **admin** → **Admin → SME Review**.
3. Approve → Reindex.

**Story:** Users cannot silently rewrite the corpus. SME is the gate.

**Code:** `app/agents/feedback.py` → `app/agents/validation.py` → SQLite `feedback.db` (`app/database/sqlite.py`).

### UC-6 — Repository and history (live, simple)

- **Repository** lists files on disk (`GET /sources`), not a fake catalog.
- **History** lists recent Q&A rows from SQLite (`GET /interactions`). Flat rows, not a threaded chat product.

### UC-7 — Tech refresh / RebootX (live) — second hero

Open **Tech refresh** (`/refresh`).

**Manual:** Python 3.9 → 3.12, deps `numpy==1.21, pandas==1.3`, environment production. Click **Assess upgrade**.

Expect: overall risk, verdict, per-risk recommendations, `ai` or `rules_fallback`. Download HTML report if time.

**Scan:** **Scan project and assess** with target `Python 3.12`. Scanner walks *this* repo only (cannot scan `C:\Windows`).

**What to claim:** Different job than Atlas. Atlas answers “what does the runbook say?” RebootX answers “is this upgrade safe?” Separate Chroma collection `compatibility_knowledge` so upgrade JSON does not pollute chat.

**Code:** `src/features/rebootx/tech-refresh-page.tsx` → `app/rebootx/router.py` → `app/rebootx/services/assessment_service.py` → `risk_engine.py`.

### UC-8 — Screens that are still a shell (show once, be honest)

| Screen | Status |
| --- | --- |
| Pipeline monitor | Mock stages |
| Agent monitor | Mock cards |
| Knowledge graph page | Mock |
| Analytics charts (confidence trend, agent latency) | Mock; totals/thumbs/top questions are live |
| Admin users / invite / logs | Mock |
| Dashboard | Mostly presentation |

**Line for leadership:** “Those screens show the target operating model. The live path today is login, ask, upload, SME review, history, repository, tech refresh.”

---

## 3. Code walkthrough for the TCS associate (45–60 min)

Walk **top-down**. Do not start in `node_modules` or Chroma internals.

### Map of the repo (draw this)

```
src/                         Vite + React (what they click)
  routes/index.tsx           URLs
  features/                  one folder per screen
  services/                  HTTP to FastAPI
app/
  api.py                     HTTP surface
  auth.py                    JWT
  pipeline.py                Ask Atlas composition root
  agents/                    intent, retrieve, verify, reason, cite, ingest…
  rebootx/                   tech-refresh engine
  database/chroma.py         enterprise_knowledge
  database/sqlite.py         feedback + history
knowledge/sop + faq          runbooks Atlas reads
knowledge/rebootx            upgrade JSON RebootX reads
Flow.md / decisions.md       how it actually runs / why
```

Two processes: **UI :5173** → **API :8000** → **Ollama :11434** + **chroma_data** + **feedback.db**.

### Stop 1 — UI entry (5 min)

Open in order:

1. `src/main.tsx`
2. `src/App.tsx` — Auth + React Query
3. `src/routes/index.tsx` — `/atlas`, `/refresh`, admin routes
4. `src/layouts/app-layout.tsx` — unauthenticated redirect, admin path guard
5. `src/services/api-client.ts` — Bearer token, `VITE_API_BASE_URL`

Ask the associate: “Where would you add a new screen?” Answer: feature folder + route + optional `NAV_ITEMS`.

### Stop 2 — Auth (5 min)

`app/auth.py` then `POST /auth/login` in `app/api.py`.

Points: in-memory demo users, PBKDF2, HS256 JWT, `require_admin` on `/admin/*`. Tokens die if `JWT_SECRET` is random per process restart.

### Stop 3 — Ask path (15 min) — most important

White-board the graph while you click files:

```
classify_intent → retrieve → verify → (reason | refuse) → cite → SQLite log
```

| File | Why it exists |
| --- | --- |
| `src/hooks/use-atlas-chat.ts` | Optimistic user bubble, then `chatService.ask` |
| `src/services/chat.service.ts` | `POST /ask` |
| `app/api.py` `ask_question` | Auth + call pipeline |
| `app/pipeline.py` | LangGraph **only here** (query has a branch) |
| `app/agents/intent.py` | Classifies question type |
| `app/agents/retrieval.py` | Dense Chroma + BM25, **RRF not score blend** |
| `app/agents/verification.py` | Rubric gate (count + score), not “LLM are you sure?” |
| `app/agents/reasoning.py` | Ollama, grounded in chunks |
| `app/agents/citation.py` | Source strings for the UI |
| `app/agents/feedback.py` | `feedback_id` for thumbs |

Ingestion is a **straight line** in the same `pipeline.py`: `ingest_and_index`. Contrast that with the graph so they see why LangGraph was used.

### Stop 4 — Storage (5 min)

- `app/database/chroma.py` — collection `enterprise_knowledge` (Ask Atlas)
- `app/rebootx/services/knowledge_service.py` — collection `compatibility_knowledge` (RebootX)
- `app/database/sqlite.py` — interactions, thumbs, SME queue

Same folder `chroma_data`, two collections. Do not mix them.

### Stop 5 — RebootX (10 min)

| File | Role |
| --- | --- |
| `app/rebootx/router.py` | `/rebootx/assess`, `/scan-and-assess`, `/report`; path sandbox |
| `app/rebootx/engine.py` | Seeds JSON on API start |
| `app/rebootx/services/assessment_service.py` | RAG + Ollama JSON or rules |
| `app/rebootx/services/risk_engine.py` | Numeric score + Go / Caution / Delay |
| `app/rebootx/services/bridge_service.py` | Scanner → `UpgradeRequest` |
| `app/rebootx/repository_scanner/` | AST / manifests / consumers |
| `knowledge/rebootx/python/python-upgrades.json` | Example KB doc |

If Ollama is down, assessment still returns `rules_fallback`. Chat `/ask` will fail to generate if reasoning needs the LLM.

### Stop 6 — What not to treat as source of truth (2 min)

- `src/constants/mock-data.ts` — leftover demo data
- `src/services/pipeline.service.ts`, `agents.service.ts`, `graph.service.ts` — still `mockRequest`
- `Overview/` — target architecture; prefer `Flow.md` for “what runs today”
- `app/frontend/streamlit_app.py` — secondary client, not the React demo

### Homework for the associate (first week)

1. Run the three terminals and complete UC-2, UC-3, UC-7 without help.
2. Add one sentence to `knowledge/sop/incident-triage-runbook.txt`, re-upload or re-ingest, ask Atlas the new fact.
3. Trace a thumbs-down from `feedback-modal.tsx` to the SQLite row.
4. Read `decisions.md` entries for JWT, verification, RRF, RebootX-as-module.

---

## 4. Suggested agendas

### TCS handover (60–75 min)

| Min | Block |
| --- | --- |
| 0–10 | Problem, architecture sketch, live vs shell |
| 10–25 | Run UC-1, UC-2, UC-3, UC-7 |
| 25–60 | Code walkthrough stops 1–5 |
| 60–75 | Gaps, how to run, first-week homework |

### Team demo (30–40 min, 2 slides max)

**Slide 1 (optional):** Problem + two capabilities + “local Ollama, data stays on the machine.”  
**Slide 2 (optional):** Timeline (below).  
Everything else is the app.

| Min | Block |
| --- | --- |
| 0–2 | 90-second opener |
| 2–8 | UC-1 user vs admin |
| 8–18 | UC-2 + UC-3 (answer + refuse) |
| 18–24 | UC-4 upload or UC-5 SME if time (pick one) |
| 24–32 | UC-7 RebootX assess + 30s of `pipeline.py` graph |
| 32–40 | What is live vs shell, timeline, Q&A |

If Ollama is slow, start the Python 3.9→3.12 assess *before* the Atlas questions so it finishes in the background.

---

## 5. How long it took (say this without inflating)

| Phase | When | What existed |
| --- | --- | --- |
| Design spec | ~26 Jul 2026 | `Overview/` documents |
| Python multi-agent RAG | ~3 Aug | `app/pipeline.py`, agents, Chroma, Streamlit |
| Atlas React shell | ~9 Aug | Screens, mostly `mock-data.ts` |
| Production-shaped wiring | **10–14 Aug (~4 days)** | JWT, CORS, live `/ask` `/upload` `/sources` `/interactions` / SME / analytics totals, runbooks indexed (~247 vectors) |
| RebootX inside Atlas | **14 Aug (1 day)** | `/refresh`, `/rebootx/*`, 26 compatibility docs |

**Honest summary:** The agent pipeline was already written. The UI looked finished but talked to mocks. The sprint you are demoing is **connecting those two**, adding auth, loading support runbooks, and **hosting RebootX in the same process** so the team sees Q&A and upgrade risk in one login.

Not done (do not promise in the room): SSO, real user directory, async ingest jobs, live pipeline/agent telemetry, CMDB, CI gates, Graphify, OpenHands.

---

## 6. Talking points if challenged

- **“Is this ChatGPT?”** No. Retrieval is local Chroma. Generation is local Ollama. Off-corpus questions refuse.
- **“Why LangGraph?”** Only the query path branches (reason vs refuse). Ingest is a function. See `decisions.md`.
- **“Why two products?”** Atlas = grounded support answers. RebootX = upgrade go/no-go. Same auth and LLM host.
- **“Can we scan any GitHub org?”** Capture-from-GitHub exists in `capture_service.py`. Local scan is sandboxed to this project on purpose.
- **“Is analytics real?”** Counts and thumbs yes. Fancy charts no.

---

## 7. File cheat-sheet (print this page)

| If they ask… | Open |
| --- | --- |
| Where do URLs live? | `src/routes/index.tsx` |
| Where is the HTTP API? | `app/api.py` |
| How does a question get answered? | `app/pipeline.py` |
| How do we not hallucinate? | `app/agents/verification.py` |
| How do we search? | `app/agents/retrieval.py` |
| How does login work? | `app/auth.py` |
| How does upgrade risk work? | `app/rebootx/services/assessment_service.py` |
| What is live vs fake? | This file §2 UC-8 and `Flow.md` |
| Why this design? | `decisions.md` |
