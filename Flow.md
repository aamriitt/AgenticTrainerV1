# Execution flow

How a request actually moves through this repo: files, functions, order. If you change a hop, update the **This session** section at the bottom in the same session.

Two processes must be running for live paths:

1. FastAPI — `uvicorn app.api:app --host 127.0.0.1 --port 8000` (module import constructs a process-wide `AgenticTrainerPipeline()` in `app/api.py`)
2. Vite — `npm run dev` (default `http://localhost:5173`), `VITE_API_BASE_URL` → `http://localhost:8000`

Ollama at `http://localhost:11434` is required for the **reason** node, not for login, sources, or health.

---

## 1. UI boot (every page)

```
src/main.tsx
  createRoot → App
src/App.tsx
  ThemeProvider
    AuthProvider          ← reads localStorage atlas-trainer-auth + token
      QueryClientProvider
        ToastProvider
          RouterProvider  ← src/routes/index.tsx
```

Unauthenticated visits to `/` hit `AppLayout` (`src/layouts/app-layout.tsx`), which `Navigate`s to `/login`. Admin-only paths (`ADMIN_ONLY_PATHS`) also bounce non-admins to `/`.

Login routes are **outside** `AppLayout`: `/login`, `/login/user`, `/login/admin`.

---

## 2. Login (live)

```
LoginPage / AdminLoginPage
  useAuth().login
    AuthProvider.login
      authService.login                    src/services/auth.service.ts
        apiRequest("/auth/login", auth:false)
          api-client.ts → fetch POST :8000/auth/login
            app/api.py login()
              app/auth.py authenticate()
              app/auth.py create_access_token()
        setAccessToken(jwt)                localStorage atlas-trainer-token
    localStorage atlas-trainer-auth        { name, email, role }
  navigate("/")
```

Later API calls: `apiRequest` reads the token and sets `Authorization: Bearer …`. FastAPI `Depends(get_current_user)` in `app/auth.py` decodes JWT via `decode_token`. Admin routes use `require_admin` (same module).

`GET /auth/me` exists but the SPA does not refresh the user from it on every load; it trusts localStorage if a token is present.

---

## 3. Ask Atlas — live RAG (primary product path)

This is the path that answers a typed question.

```mermaid
sequenceDiagram
  participant UI as AtlasWorkspacePage
  participant Hook as useAtlasChat
  participant CS as chatService.ask
  participant API as api.py ask_question
  participant P as AgenticTrainerPipeline.ask
  participant G as LangGraph StateGraph
  participant FS as FeedbackStore

  UI->>Hook: send(question)
  Hook->>Hook: append user turn (optimistic)
  Hook->>CS: ask(question)
  CS->>API: POST /ask { question } + JWT
  API->>API: get_current_user
  API->>P: ask(question)
  P->>G: invoke({ question })
  Note over G: classify_intent → retrieve → verify
  alt sufficient_evidence
    G->>G: reason (Ollama)
  else
    G->>G: refuse
  end
  G->>G: cite
  P->>FS: log_answer (unless log_feedback=False)
  P-->>API: AnswerResult, feedback_id
  API-->>CS: AskResponse
  CS-->>Hook: ChatMessage
  Hook->>Hook: append Atlas turn; invalidate ["history"]
```

### Ordered hops (query graph)

| Order | File | Function | Does |
| --- | --- | --- | --- |
| 1 | `src/features/chat/atlas-workspace-page.tsx` | page | User submits text |
| 2 | `src/hooks/use-atlas-chat.ts` | `send` → `askMutation` | Optimistic user bubble |
| 3 | `src/services/chat.service.ts` | `ask` | Maps API JSON → `ChatMessage` |
| 4 | `src/services/api-client.ts` | `apiRequest` | JWT + `fetch` |
| 5 | `app/api.py` | `ask_question` | Auth, empty-question 400 |
| 6 | `app/pipeline.py` | `AgenticTrainerPipeline.ask` | `self._graph.invoke` |
| 7 | `app/agents/intent.py` | `IntentAgent.classify` | Graph node `classify_intent` |
| 8 | `app/agents/retrieval.py` | `RetrievalAgent.retrieve` | Dense + BM25, RRF. Uses `EmbeddingAgent.embed_query` + `ChromaStore` |
| 9 | `app/agents/verification.py` | `VerificationAgent.verify` | Rubric gate |
| 10a | `app/agents/reasoning.py` | `ReasoningAgent.generate_answer` | Only if evidence sufficient; Ollama |
| 10b | `app/pipeline.py` | `_node_refuse` | Fixed refusal string |
| 11 | `app/agents/citation.py` | `build_citations` | Skipped list if refused |
| 12 | `app/agents/feedback.py` | `FeedbackAgent.log_answer` | SQLite row → `feedback_id` |
| 13 | `app/api.py` | `format_citation` | Citations become strings for JSON |

Seed bubbles on first load **do not** take this path: `chatService.getSeedConversation` → `mockRequest(MOCK_CHAT_SEED)`.

---

## 4. Upload + ingest (live index, mock queue UI)

```
UploadCenterPage
  uploadService.uploadFile                 src/services/upload.service.ts
    FormData POST /upload
      app/api.py upload_file
        _safe_filename, 50 MB cap
        write knowledge/{pdf|sop|faq|videos}/…
        pipeline.ingest_and_index(path)
```

Ingest is **not** LangGraph. Order inside `AgenticTrainerPipeline.ingest_and_index`:

1. `app/agents/ingestion.py` — `ingest_file` (PDF/DOCX/text/Whisper for audio-video)
2. `app/agents/cleaning.py` — `clean_document`
3. `app/agents/chunking.py` — `chunk_document`
4. `ChromaStore.delete_by_source_id` — drop old vectors for that source
5. `EmbeddingAgent.embed_chunks`
6. `ChromaStore.upsert_chunks`
7. `RetrievalAgent._bm25 = None` — next query rebuilds BM25

`uploadService.getQueue` is still mock (`MOCK_UPLOAD_JOBS`).

---

## 5. Feedback → SME review → reindex (live)

```
FeedbackModal
  feedbackService.thumbsUp / thumbsDown    src/services/feedback.service.ts
    POST /feedback/{id}/up|down
      app/api.py
        FeedbackAgent.submit_thumbs_up | submit_thumbs_down

AdminPage (SME tab)
  adminService.listPending                 GET  /admin/pending
  adminService.approve / reject            POST /admin/{id}/approve|reject
  adminService.reindexApproved             POST /admin/reindex
      ValidationAgent.list_pending / approve / reject
      ValidationAgent.process_approved_corrections
        (embeds correction text back into Chroma)
```

Admin HTTP routes use `require_admin`. Users/logs/invite on the same Admin page are still mock.

---

## 6. Repository, history, analytics (mixed)

| UI | Frontend | Backend | Live? |
| --- | --- | --- | --- |
| Knowledge Repository | `repositoryService.list` | `GET /sources` walks `knowledge/` | Live |
| Conversation History | `historyService.list` | `GET /interactions` → `FeedbackStore.list_recent_interactions` | Live (flat Q&A rows) |
| Analytics summary / top questions / thumbs | `analyticsService` + `adminService.getAnalytics` | `GET /admin/analytics` | Live |
| Confidence chart, retrieval trend, agent latency, doc usage | `analyticsService` | — | **Mock** |
| Dashboard | `dashboard.service.ts` | — | Mostly mock / derived |
| Pipeline monitor | `pipelineService.getStages` | — | **Mock** |
| Agent monitor | `agentsService.list` | — | **Mock** |
| Knowledge graph | `graph.service.ts` | — | **Mock** |
| Admin model status | `adminService.getModelStatus` | `GET /health` | Live-ish (health only) |

---

## 7. Process-wide objects (import time)

`app/api.py` does `pipeline = AgenticTrainerPipeline()` once per uvicorn worker. That constructs:

- `EmbeddingAgent`, `ChromaStore`, `FeedbackStore`
- `IntentAgent`, `RetrievalAgent`, `VerificationAgent`, `ReasoningAgent`
- `FeedbackAgent`, `ValidationAgent`
- compiled LangGraph `_graph`

There is no per-request pipeline. Reloading uvicorn is required to pick up code changes unless `--reload` is on.

---

## This session (2026-08-13)

**Not modifying any runtime hop above.**

| Action | Path |
| --- | --- |
| Added | `.cursor/rules/decision-log.mdc` |
| Added | `.cursor/rules/execution-flow.mdc` |
| Added | `.cursor/rules/quiz-gate.mdc` |
| Added | `decisions.md` (historical + process decisions) |
| Added | `Flow.md` (this file) |

If a later session changes `/ask`, ingest, auth, or a service that is still mocked, replace this section with the exact hop being edited and keep the diagrams above in sync.
