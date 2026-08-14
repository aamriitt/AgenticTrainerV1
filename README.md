# Agentic Trainer — powered by Atlas

An enterprise knowledge-enablement platform. Employees ask natural-language questions
and get answers grounded in internal documents, runbooks, KT recordings, and SOPs
through **Atlas**, the embedded AI assistant.

Built with React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, and Framer Motion.

---

## 1. Prerequisites

- **Node.js v18 or newer** — check with `node -v`. Get it at [nodejs.org](https://nodejs.org) if needed.
- That's it for the app itself. If you want Ask Atlas to give real (not scripted) answers, see [§4](#4-connecting-a-real-llm-optional) — you'll optionally also want **[Ollama](https://ollama.com/download)** installed.

## 2. Running it

```bash
unzip atlas-trainer-project.zip
cd atlas-trainer
npm install
npm run dev
```

Open the URL it prints — usually **http://localhost:5173**. You'll land on `/login`.

To build a production bundle instead of running the dev server:

```bash
npm run build      # outputs to dist/
npm run preview    # serves the built bundle locally to sanity-check it
```

## 3. Signing in — three account types

`/login` shows three doors. Any name/email/password gets you in (there's no real
backend auth — this is a frontend prototype) — what matters is **which door you pick**,
since that decides your role and what you can see:

| Door | Role | Can access |
|---|---|---|
| **SME sign-in** | `sme` | Dashboard, Ask Atlas, Knowledge Repository, Upload Center, Conversation History, Knowledge Graph |
| **User sign-in** | `user` | Dashboard, Ask Atlas, Conversation History, Knowledge Graph — **no Repository, no Upload Center** |
| **Admin console sign-in** | `admin` | Everything, including Pipeline Monitor, Agent Monitor, Analytics, and Admin |

Access is enforced at the routing level, not just hidden in the sidebar — a `user`-role
account typing `/repository` or `/upload` directly into the URL bar gets redirected back
to the dashboard.

## 4. Connecting a real LLM (optional)

By default, Ask Atlas runs in **demo mode** — it answers using a small set of
scripted responses plus a real department-filtering search over your knowledge base (see
§5). It clearly labels itself "[Demo mode]" so nothing is passed off as more than it is.

To make it call a **real model**, open Ask Atlas and click **"Connect LLM"** in the
top-right of the toolbar. Two options:

### Option A — Ollama (free, local, default)

1. Install [Ollama](https://ollama.com/download)
2. Pull a model: `ollama pull gemma2` (or `gemma2:2b` for a lighter/faster option)
3. Start Ollama with browser access allowed:
   - **Mac/Linux:** `OLLAMA_ORIGINS=* ollama serve`
   - **Windows (PowerShell):**
     ```powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     ```
     If you get "address already in use," Ollama's already running as a background
     app — instead, set `OLLAMA_ORIGINS` as a **User** environment variable (search
     "Environment Variables" in the Start menu → "Edit environment variables for your
     account" → New → Name: `OLLAMA_ORIGINS`, Value: `*`), then fully quit and reopen
     Ollama (or restart your PC) for it to take effect.
4. In the app's "Connect LLM" modal, leave it on the Ollama tab, confirm the URL
   (`http://localhost:11434`) and model (`gemma2`), click **Connect**.

Nothing leaves your machine with this option — no API key, no cost, no rate limits.

### Option B — Anthropic API (cloud)

Get a key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys),
switch to the Anthropic tab in the "Connect LLM" modal, paste it in, click Connect. The
key is stored only in your browser's `localStorage` and sent only to
`api.anthropic.com` — never to any server of ours.

> Gemma via Ollama is noticeably weaker and slower than Claude, especially on a laptop
> without a GPU. If a demo is high-stakes, test your exact setup once beforehand rather
> than debugging it live.

## 5. How retrieval works

There's no real vector database or document-embedding pipeline yet (see
[Known limitations](#7-known-limitations) below). What *is* real:

- **Department-scoped retrieval.** Every document — seed data or freshly uploaded — is
  tagged with a Department and Branch. Ask Atlas something like *"show me documents
  from Analytics"* and it genuinely filters the knowledge store by that field and
  returns only matching documents, in both demo mode and live-LLM mode. If nothing
  matches, it says so rather than inventing an answer.
- **Live grounding context.** When a real LLM is connected, its system prompt includes
  a full directory of every document (title, department, branch, SME) plus hand-written
  source excerpts, so its answers stay consistent with what the rest of the app cites.

## 6. Uploading knowledge (SME / Admin only)

Go to **Upload Center**, drag in a file (or click "Add Knowledge File"). Before
processing starts, you'll be asked to tag it with a **Department**, **Branch**, and
optional **Specification/notes** — this is what makes department-scoped retrieval work
correctly and avoids cross-department mismatches. Once the simulated pipeline finishes
(chunked → indexed), the file is registered into the knowledge store and immediately
shows up in the Repository and is retrievable through Ask Atlas.

Uploads persist in your browser's `localStorage`, so they survive a page refresh but are
local to that browser — they won't appear on a different machine or for a different
person.

## 7. Known limitations

Being upfront about these so nothing surprises you mid-demo:

- **No real document parsing.** Upload Center simulates chunking/embedding progress —
  it does not actually extract or embed the file's contents.
- **No real vector database.** Department filtering works on real structured metadata;
  topic-based "grounding" for the built-in seed documents is a hand-written text blob
  standing in for actual retrieval.
- **The six-agent architecture shown in Agent Monitor is illustrative**, not live —
  Pipeline Monitor and Agent Monitor display static/simulated data, not a running
  LangGraph orchestration.
- **No real backend auth.** Login accepts any credentials; role is decided purely by
  which door you picked. Sessions live in `localStorage`, not a server.

## 8. Project structure

```
src/
  components/     UI primitives, branding, and feature-specific components
  constants/      Mock data, navigation config, departments/branches
  contexts/       Auth, theme, and toast providers
  features/       One folder per page/surface (dashboard, chat, repository, ...)
  hooks/          Data-fetching and UI hooks
  layouts/        App shell — sidebar, topbar, route guard
  pages/          Login screens (SME / User / Admin) and 404
  routes/         React Router route table
  services/       Mock API services + the LLM client + knowledge store
  types/          Shared TypeScript types
```
