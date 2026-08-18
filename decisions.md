# Decision log

Living record of meaningful choices made while changing this codebase. Each entry is *why*, not a changelog of *what*. Update this file in the same session as the code change.

---

## 2026-08-18 — Env-based API URL + RebootX facts in Atlas KB

**Decision:** Frontend default base URL is `/api` (Vite/preview proxy to `API_PROXY_TARGET`). Production sets `VITE_API_BASE_URL` to the public API origin. RebootX JSON is exported to `knowledge/sop/rebootx-*-compatibility.txt` and indexed into Atlas `enterprise_knowledge` on API start.

**Alternatives:** Keep hardcoded `localhost:8000`; leave upgrade facts only in the RebootX Chroma collection.

**Why this:** A clone on GitHub must run without editing source for localhost. Ask Atlas should answer upgrade questions from the same facts RebootX uses, so the two products share one KB in git.

**Tradeoff accepted:** First API start after pull re-embeds those SOP files (idempotent by source_id). Set `ATLAS_SYNC_REBOOTX_KB=false` to skip. Same-origin `/api` needs a reverse proxy in production if UI and API are split without `VITE_API_BASE_URL`.

**Files:** `src/services/api-client.ts`, `vite.config.ts`, `app/api.py`, `app/config.py`, `app/knowledge_bridge.py`, `knowledge/sop/rebootx-*.txt`, `.env.example`

---

## 2026-08-17 — Refuse related-but-wrong-topic RAG hits (LangChain vs LangGraph)

**Decision:** After hybrid retrieval, drop chunks that do not contain distinctive query tokens (length ≥ 6). Verification now also receives the question and refuses if those tokens are absent. Reasoning prompt forbids substituting a related topic.

**Alternatives:** Raise `MIN_RELEVANCE_SCORE` globally; LLM-as-judge after generation; query expansion.

**Why this:** Vector search puts LangChain notes near a LangGraph question, cosine often clears 0.35, and RRF always has a #1. The gate never looked at the question, so the LLM answered from the nearest document and cited it. Distinctive-term overlap is cheap and catches this class of error without an extra LLM call.

**Tradeoff accepted:** Paraphrases that never use a long query term (e.g. “graph orchestration library” with no “langgraph”) may refuse even if notes would have helped. Short codes like `MOQ` still rely on BM25. The first version used OR-matching on all long words, which still let a LangGraph question hit LangChain notes because those pages contain “document” / “loader” / “methods”. Required terms are now product/topic tokens only, and **all** of them must appear.

**Files:** `app/agents/retrieval.py`, `app/agents/verification.py`, `app/agents/reasoning.py`, `app/pipeline.py`

---

## 2026-08-14 — Integrate RebootX as a module, not a second app

**Decision:** Copy the RebootX assessment engine, scanner, compatibility JSON, and reports into `app/rebootx/` and expose them on the existing FastAPI + Atlas UI (`/refresh`). Do not run a second uvicorn/Streamlit stack.

**Alternatives:** Git submodule + sidecar on another port; HTTP-call the original RebootX repo; rewrite scoring in TypeScript.

**Why this:** Atlas already has JWT, CORS, Ollama, and Chroma. A second process would split auth and confuse the demo. RebootX’s value is the upgrade contract (capture → RAG → LLM/rules → risk engine → verdict), which Ask Atlas does not do.

**Tradeoff accepted:** Two Chroma collections in one `chroma_data` dir (`enterprise_knowledge` vs `compatibility_knowledge`). RebootX still uses Chroma’s default embedder, not BGE, so upgrade docs are not mixed into `/ask`. Streamlit UI from the original RebootX repo is not ported. Local scan is sandboxed to this project so the API cannot walk `C:\`.

**Files:** `app/rebootx/**`, `knowledge/rebootx/**`, `app/api.py`, `src/features/rebootx/tech-refresh-page.tsx`, `src/services/rebootx.service.ts`, `src/routes/index.tsx`, `src/constants/navigation.ts`, `requirements.txt` (`httpx`, `fpdf2`)

---

## 2026-08-13 — Process: decision log, flow map, quiz gate

**Decision:** Add always-on Cursor rules plus two repo-root docs (`decisions.md`, `Flow.md`) so later sessions cannot silently rewire the system.

**Alternatives:** Rely on `Overview/` design docs only; put process notes in `AGENTS.md`; quiz only when the user remembers to ask.

**Why this:** Overview docs describe intended architecture and can drift. A dated decision log plus a call-path file that names the hop being edited is cheaper to keep honest. Three small always-apply rules (`decision-log`, `execution-flow`, `quiz-gate`) beat one huge rule.

**Tradeoff accepted:** Extra write-up on every non-trivial change. Quiz gate slows “just ship it” after a long session; that is the point.

**Not a major runtime change:** No product call path was modified in this session.

**Files:** `.cursor/rules/decision-log.mdc`, `.cursor/rules/execution-flow.mdc`, `.cursor/rules/quiz-gate.mdc`, `decisions.md`, `Flow.md`

---

## 2026-08-10 — Wire the React UI to the existing FastAPI RAG pipeline

**Decision:** Keep `AgenticTrainerPipeline` as the composition root and make the Vite app call FastAPI. Do not rebuild RAG in TypeScript.

**Alternatives:** Port agents to the frontend; add a BFF; keep Streamlit as the only real client.

**Why this:** Ingestion, hybrid retrieval, verification gate, and SME-gated feedback already lived in Python (`app/pipeline.py`, `app/agents/*`). Duplicating that in the UI would split truth. Streamlit (`app/frontend/streamlit_app.py`) stays a secondary client.

**Tradeoff accepted:** Two UIs can drift. React services still mix live calls and mocks (pipeline/agent monitors, some analytics charts).

**Files:** `app/api.py`, `src/services/*.ts`, `src/services/api-client.ts`

---

## 2026-08-10 — JWT (PyJWT) instead of sessions or SSO for bootstrap auth

**Decision:** HS256 JWT via `PyJWT`, `HTTPBearer`, FastAPI `Depends`. Demo users in memory: `user@company.com` / `User123!`, `admin@company.com` / `Admin123!`.

**Alternatives:** Cookie sessions; OIDC/SSO immediately; trust the old localStorage role with no backend check.

**Why this:** The UI is a SPA on `:5173` talking to API on `:8000` (different origin). Bearer JWT is the smallest cross-origin auth that the API can enforce. SSO is Phase 3+. PyJWT was added because FastAPI does not mint tokens by itself.

**Tradeoff accepted:** `JWT_SECRET` defaults to a random value per process if unset, so tokens die on API restart. Passwords are PBKDF2-HMAC-SHA256 in process memory, not a user table. Demo credentials are documented in code.

**Files:** `app/auth.py`, `requirements.txt`, `src/services/auth.service.ts`, `src/contexts/auth-context.tsx`

---

## 2026-08-10 — CORS allowlist for Vite, credentials on

**Decision:** `CORSMiddleware` with origins from `CORS_ORIGINS` (default `localhost:5173` / `127.0.0.1:5173` / `localhost:3000`).

**Alternatives:** `allow_origins=["*"]` with credentials (invalid); proxy all API traffic through Vite.

**Why this:** Browser will block `:5173` → `:8000` without CORS. An allowlist is enough for local/demo without opening every origin.

**Tradeoff accepted:** Deployed UI origin must be added to `CORS_ORIGINS` or the browser will fail auth’d fetches.

**Files:** `app/api.py`, `.env.example`

---

## 2026-08-10 — Protect knowledge routes; leave `/health` and `/auth/login` public

**Decision:** `get_current_user` on `/ask`, `/upload`, `/sources`, `/interactions`, feedback. `require_admin` on `/admin/*`. `/health` unauthenticated for ops.

**Alternatives:** Auth on every route including health; UI-only guards.

**Why this:** Frontend `AppLayout` already redirects unauthenticated users and hides admin nav, but that is not security. Health checks should not need a JWT.

**Tradeoff accepted:** Anyone who can reach `:8000` can see vector count and Ollama model name via `/health`.

**Files:** `app/api.py`, `src/layouts/app-layout.tsx`

---

## 2026-08-10 — Safe upload filenames + 50 MB cap, then ingest immediately

**Decision:** Strip unsafe characters, map extension → `knowledge/{pdf,sop,faq,videos}`, stream with a 50 MB abort, then `pipeline.ingest_and_index`.

**Alternatives:** Async job queue; store then index later; trust `UploadFile.filename`.

**Why this:** Path traversal via `../../` names is a real upload bug. Sync ingest matches current corpus size (hundreds of vectors) and keeps the demo one-shot. Async ingestion is explicitly Phase 3.

**Tradeoff accepted:** Large files block the API worker. Failed ingest can leave a file on disk after a 500.

**Files:** `app/api.py`

---

## 2026-08-10 — LangGraph only on the query path; ingestion stays a linear function

**Decision (pre-existing, still binding):** `ingest_and_index` is a plain function. `ask` is a compiled `StateGraph` because verification branches to reason vs refuse.

**Alternatives:** Graph both pipelines; no graph, just Python if/else.

**Why this:** LangGraph is justified where there is a real gate. Ingestion has no LLM routing. `QueryState` is a `TypedDict` because LangGraph merges partial node updates.

**Tradeoff accepted:** Two pipeline styles to explain. Graph overhead is negligible next to embedding + LLM.

**Files:** `app/pipeline.py`

---

## 2026-08-10 — Hybrid retrieval with RRF, not a weighted sum of raw scores

**Decision (pre-existing, still binding):** Dense Chroma search + BM25, fused with reciprocal rank fusion. BM25 cache invalidated after ingest.

**Alternatives:** Vector-only; BM25-only; `alpha * cosine + (1-alpha) * bm25`.

**Why this:** Error codes and acronyms need lexical match; paraphrases need vectors. Cosine and BM25 are not on the same scale, so a weighted sum lets one silently dominate.

**Tradeoff accepted:** BM25 is rebuilt from Chroma when the cache is cold. Fine for SME-gated corpora; not for high-churn ingest.

**Files:** `app/agents/retrieval.py`

---

## 2026-08-10 — Rubric verification instead of “ask the LLM if it is sure”

**Decision (pre-existing, still binding):** `VerificationAgent` uses chunk count, fused score threshold, and a cheap polarity heuristic. False refuse is preferred over a confident hallucination.

**Alternatives:** LLM-as-judge; always answer from top-k.

**Why this:** Self-reported model confidence is a weak signal. The product promise is grounded enterprise answers.

**Tradeoff accepted:** Conservative thresholds will refuse some answerable questions.

**Files:** `app/agents/verification.py`

---

## 2026-08-10 — Default reasoning model: llama3 (local Ollama), not gemma3

**Decision:** Point `OLLAMA_MODEL` at `llama3` after gemma3 OOM/crash during `/ask`.

**Alternatives:** Cloud LLM; keep gemma3; smaller gemma variant.

**Why this:** The stack is already Ollama-local. llama3 answered without blowing RAM on this machine.

**Tradeoff accepted:** Quality/latency differ from the original spec model. No cloud fallback if Ollama is down (`/ask` fails).

**Files:** `.env`, `app/config.py`

---

## 2026-08-10 — Embeddings: BAAI/bge-base-en-v1.5 with separate query vs document embed

**Decision (pre-existing, still binding):** sentence-transformers BGE; query prefix instruction; lazy model load; injectable stub for tests.

**Alternatives:** Ollama embeddings; OpenAI embeddings; one `embed()` for both sides.

**Why this:** Matches the architecture spec. BGE retrieval quality depends on prefixing queries, not documents.

**Tradeoff accepted:** First `/ask` or ingest pays model-load cost and RAM. HuggingFace must be reachable unless a stub is injected.

**Files:** `app/agents/embeddings.py`

---

## 2026-08-10 — Chroma on disk + SQLite feedback; no new conversation table

**Decision:** Vectors in `chroma_data`. Interactions/feedback in `feedback.db`. History UI reads `list_recent_interactions` from that same SQLite store.

**Alternatives:** Postgres; a dedicated `conversations` table; store history only in the browser.

**Why this:** Chroma was already the vector store. Feedback rows already had question, answer, citations, rating. A second store would desync SME review from history.

**Tradeoff accepted:** History is Q&A rows, not threaded chats. Chroma telemetry (`capture()` arity) is noisy and ignored.

**Files:** `app/database/chroma.py`, `app/database/sqlite.py`, `src/services/history.service.ts`

---

## 2026-08-10 — Repository lists disk files (`GET /sources`), not Chroma metadata

**Decision:** Walk `settings.knowledge_dir` and return path, size, mtime, plus `vectors_stored`.

**Alternatives:** Distinct documents collection in Chroma; parse upload jobs only.

**Why this:** Operators need to see what is on disk (including files that failed to index). Cheap and accurate for the demo corpus.

**Tradeoff accepted:** A file can appear in the repository even if it produced zero chunks. External clone under `knowledge/external/` shows up if it sits inside `knowledge_dir`.

**Files:** `app/api.py` (`list_sources`), `src/services/repository.service.ts`

---

## 2026-08-10 — Frontend: one `apiRequest` helper, JWT in localStorage

**Decision:** `src/services/api-client.ts` attaches `Authorization: Bearer` unless `auth: false`. Token key `atlas-trainer-token`. User snapshot in `atlas-trainer-auth`.

**Alternatives:** HttpOnly cookie set by API; in-memory token only; Axios instance.

**Why this:** Native `fetch` matches Vite. localStorage is enough for a demo SPA. `auth: false` is required for login and health.

**Tradeoff accepted:** XSS can steal the JWT. 401 does not globally redirect (callers handle errors). Chat maps API failures into an Atlas warning bubble instead of throwing.

**Files:** `src/services/api-client.ts`, `src/contexts/auth-context.tsx`, `src/services/chat.service.ts`

---

## 2026-08-10 — Leave pipeline/agent monitors and several analytics charts on mocks

**Decision:** `pipeline.service.ts` and `agents.service.ts` stay `mockRequest`. Analytics summary/top questions/feedback counts are live; confidence distribution, retrieval trend, agent latencies, document usage stay mock.

**Alternatives:** Fake live charts from logs; instrument every agent with timings now.

**Why this:** Phase 2 was “wire what the API already knows.” Per-agent latency and pipeline stage telemetry do not exist as API yet (Phase 3).

**Tradeoff accepted:** Admin screens can look “alive” while showing synthetic numbers next to real SME queues.

**Files:** `src/services/pipeline.service.ts`, `src/services/agents.service.ts`, `src/services/analytics.service.ts`, `src/constants/mock-data.ts`

---

## 2026-08-10 — Seeded Atlas greeting stays mock; only `send` hits `/ask`

**Decision:** `useAtlasChat` loads `MOCK_CHAT_SEED` via `chatService.getSeedConversation`. User questions go to `chatService.ask` → `POST /ask`.

**Alternatives:** Empty transcript; hydrate from `/interactions`.

**Why this:** Demo needs an immediate conversation without a round-trip. Live history is a separate page.

**Tradeoff accepted:** Seed citations are not from the current corpus. `_history` is passed into `ask` but unused by the API (stateless RAG).

**Files:** `src/hooks/use-atlas-chat.ts`, `src/services/chat.service.ts`
