# 🧠 Atlas — Agentic Enterprise Knowledge Platform

> An AI-powered enterprise knowledge platform that enables employees to access organizational knowledge through natural-language conversations.

**Atlas** is the AI assistant inside the **Agentic Trainer** platform.

The platform is designed to centralize enterprise knowledge such as SOPs, runbooks, technical documentation, training material, and knowledge-transfer resources. Instead of manually searching through multiple systems, employees can ask Atlas questions in natural language and receive AI-generated responses based on the available knowledge and configured language model.

---

# ✨ Key Features

* 🔐 Separate Admin and User login experiences
* 👥 Role-Based Access Control (RBAC)
* 🤖 AI-powered conversational assistant
* 🦙 Local LLM support through Ollama
* ☁️ Cloud LLM support through Anthropic
* 🔄 Provider abstraction layer
* 📚 Centralized knowledge repository
* 🧠 Context-aware AI interaction
* 🤖 Conceptual multi-agent architecture
* 👁️ Agent monitoring interface
* ⚙️ Pipeline monitoring interface
* 📊 Analytics dashboard
* 🔒 Protected admin-only routes
* 🧩 Modular and extensible architecture

---

# 🎯 Problem Statement

Enterprise knowledge is usually distributed across multiple sources:

* Standard Operating Procedures
* Technical documentation
* Runbooks
* Knowledge Transfer sessions
* Training materials
* Internal documents
* Team resources

Finding the correct information can be slow and inefficient.

Atlas addresses this problem by providing a centralized AI interface where users can ask questions naturally.

Example:

> **User:** How do I handle a deployment failure?

Instead of manually searching through multiple documents, the system can process the query, retrieve relevant context, send it to the configured LLM, and generate a structured response.

---

# 🏗️ High-Level System Architecture

```text
                         ENTERPRISE USERS
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Authentication/RBAC  │
                    └───────────┬──────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
            ADMIN PORTAL                  USER PORTAL
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                           ASK ATLAS
                                │
                                ▼
                           CHAT SERVICE
                                │
                                ▼
                    CONTEXT / KNOWLEDGE LAYER
                                │
                                ▼
                       LLM ABSTRACTION LAYER
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 OLLAMA                  ANTHROPIC
                  LOCAL                    CLOUD
                    │                       │
                    └───────────┬───────────┘
                                ▼
                           AI RESPONSE
                                │
                                ▼
                              USER


                 ADMIN OBSERVABILITY LAYER
                 ──────────────────────────
                    • Analytics
                    • Agent Monitor
                    • Pipeline Monitor
```

---

# 🔐 Authentication and Role-Based Access

Atlas provides two separate access experiences.

## 👤 User Portal

The User Portal is designed for regular employees or team members.

Users can access:

* Dashboard
* Ask Atlas
* Knowledge Repository
* Standard knowledge and training resources

Users cannot access:

* Analytics
* Agent Monitor
* Pipeline Monitor
* Administrative controls

Conceptually:

```text
User Login
    │
    ▼
Authentication
    │
    ▼
Role = USER
    │
    ▼
User Permissions
    │
    ├── Dashboard          ✓
    ├── Ask Atlas          ✓
    ├── Knowledge          ✓
    ├── Analytics          ✗
    ├── Agent Monitor      ✗
    └── Pipeline Monitor   ✗
```

---

## 🛡️ Admin Portal

The Admin Portal provides complete platform visibility and administrative access.

Administrators can access:

* Dashboard
* Ask Atlas
* Knowledge Repository
* Analytics
* Agent Monitor
* Pipeline Monitor
* Administrative features

```text
Admin Login
    │
    ▼
Authentication
    │
    ▼
Role = ADMIN
    │
    ▼
Admin Permissions
    │
    ├── Dashboard          ✓
    ├── Ask Atlas          ✓
    ├── Knowledge          ✓
    ├── Analytics          ✓
    ├── Agent Monitor      ✓
    ├── Pipeline Monitor   ✓
    └── Admin Controls     ✓
```

### Security Approach

Restricted features are protected through role-based access and routing.

This means the application should not rely only on hiding navigation elements.

For example, a normal user attempting to manually access:

```text
/analytics
```

should be denied or redirected.

---

# 🤖 Ask Atlas

Ask Atlas is the central AI interaction interface.

The high-level request flow is:

```text
User Question
      │
      ▼
Ask Atlas Interface
      │
      ▼
Chat Service
      │
      ▼
Context / Knowledge Processing
      │
      ▼
Prompt Construction
      │
      ▼
LLM Provider Layer
      │
      ├── Ollama
      │
      └── Anthropic
      │
      ▼
Response Generation
      │
      ▼
User
```

---

# 🧠 LLM Provider Abstraction

Atlas uses a provider abstraction layer so that the application is not tightly coupled to a single AI provider.

The core application interacts with a generic interface:

```text
callLLM()
```

The selected provider handles the underlying model request.

```text
                    ATLAS
                      │
                      ▼
                  callLLM()
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      Ollama Provider       Anthropic Provider
          │                       │
          ▼                       ▼
      Local Model           Cloud Model
```

### Benefits

* Easy provider switching
* No dependency on one LLM vendor
* Local and cloud AI support
* Easier maintenance
* Better extensibility
* Future providers can be added without changing the core chat logic

---

# 🦙 Ollama Integration

Ollama is configured as the default local AI provider.

The request flow is:

```text
Atlas
   │
   ▼
Chat Service
   │
   ▼
LLM Abstraction Layer
   │
   ▼
Ollama Provider
   │
   ▼
http://localhost:11434
   │
   ▼
Gemma Model
```

### Advantages

* No API key required
* No per-request API billing
* Local model execution
* Better privacy
* Reduced cloud dependency

---

# ☁️ Anthropic Integration

Anthropic is available as an optional cloud provider.

```text
Atlas
   │
   ▼
callLLM()
   │
   ▼
Anthropic Provider
   │
   ▼
Anthropic API
   │
   ▼
Claude Model
```

Anthropic can be used when:

* Higher-quality cloud reasoning is preferred
* Local hardware is limited
* Ollama is unavailable
* A cloud-based fallback is required

---

# 🔄 LLM Provider Switching

Atlas supports switching between AI providers.

## Local Mode

```text
Ollama
   +
Gemma
```

## Cloud Mode

```text
Anthropic
   +
Claude
```

The application remains unchanged because requests pass through the provider abstraction layer.

---

# 🤖 Conceptual Multi-Agent Architecture

Atlas is designed around a multi-agent architecture.

The conceptual system includes:

1. Orchestrator Agent
2. Intent Agent
3. Retrieval Agent
4. Memory Agent
5. Reasoning Agent
6. Citation Agent

```text
                    USER QUERY
                        │
                        ▼
                 ┌─────────────┐
                 │ ORCHESTRATOR│
                 │    AGENT    │
                 └──────┬──────┘
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   Intent Agent   Retrieval Agent   Memory Agent
        │               │                │
        └───────────────┼────────────────┘
                        │
                        ▼
                 Reasoning Agent
                        │
                        ▼
                 Citation Agent
                        │
                        ▼
                   FINAL ANSWER
```

---

# 🧭 Agent Responsibilities

## 1. Orchestrator Agent

The Orchestrator coordinates the AI workflow.

Responsibilities:

* Receive the user query
* Determine the required processing flow
* Decide which agents should participate
* Coordinate information exchange
* Combine agent outputs

---

## 2. Intent Agent

The Intent Agent determines what the user is trying to accomplish.

Example:

```text
User Query:
"How do I handle a deployment failure?"

Intent:
Troubleshooting

Domain:
Deployment Pipeline

Required Knowledge:
Deployment SOP / Runbook
```

---

## 3. Retrieval Agent

The Retrieval Agent identifies relevant knowledge.

```text
User Question
      │
      ▼
Retrieval Agent
      │
      ▼
Knowledge Repository
      │
      ├── SOPs
      ├── Runbooks
      ├── Documentation
      └── Training Material
      │
      ▼
Relevant Context
```

---

## 4. Memory Agent

The Memory Agent manages contextual information.

It can maintain:

* Previous questions
* Previous answers
* Conversation history
* User context

Example:

```text
User:
"What is the deployment process?"

Atlas:
[Explains deployment process]

User:
"What happens if step 3 fails?"
```

The Memory Agent allows the system to understand that the second question refers to the earlier conversation.

---

## 5. Reasoning Agent

The Reasoning Agent combines:

```text
User Question
      +
Retrieved Context
      +
Conversation Memory
```

It then generates a structured answer using the configured language model.

---

## 6. Citation Agent

The Citation Agent connects responses to relevant sources.

Its purpose is to improve:

* Traceability
* Trust
* Verification
* Enterprise reliability

```text
Generated Answer
       │
       ▼
Citation Agent
       │
       ▼
Answer + Source References
```

---

# ⚠️ Current Implementation

The current functional AI flow is:

```text
USER QUESTION
      │
      ▼
CHAT SERVICE
      │
      ▼
CONTEXT / RETRIEVAL
      │
      ▼
callLLM()
      │
      ├── OLLAMA
      │
      └── ANTHROPIC
             │
             ▼
        LLM RESPONSE
```

The multi-agent architecture represents the intended orchestration architecture of the platform.

The Agent Monitor and Pipeline Monitor provide the product-level visualization and observability framework for this architecture.

A future implementation can make the individual agents independently executable using graph-based orchestration.

---

# 📚 Knowledge Repository

The Knowledge Repository is designed to store enterprise information such as:

* SOPs
* Runbooks
* Technical documents
* Training materials
* Knowledge Transfer documents
* Internal resources

A future Retrieval-Augmented Generation pipeline can follow:

```text
DOCUMENT
   │
   ▼
Extract Content
   │
   ▼
Preprocess
   │
   ▼
Split into Chunks
   │
   ▼
Generate Embeddings
   │
   ▼
Store in Vector Database
```

During query processing:

```text
USER QUESTION
      │
      ▼
Generate Query Representation
      │
      ▼
Similarity Search
      │
      ▼
Retrieve Relevant Knowledge
      │
      ▼
Provide Context to LLM
      │
      ▼
Generate Response
```

---

# 👁️ Agent Monitor

The Agent Monitor provides visibility into the conceptual AI workflow.

```text
┌────────────────────────────────┐
│ AGENT MONITOR                  │
├────────────────────────────────┤
│ Orchestrator     ● Active      │
│ Intent Agent     ● Active      │
│ Retrieval Agent  ● Active      │
│ Memory Agent     ● Active      │
│ Reasoning Agent  ● Active      │
│ Citation Agent   ● Active      │
└────────────────────────────────┘
```

Future metrics can include:

* Agent status
* Current task
* Execution time
* Success rate
* Error rate
* Last execution

---

# ⚙️ Pipeline Monitor

The Pipeline Monitor provides visibility into the AI request lifecycle.

```text
User Query
    │
    ▼
Input Processing
    │
    ▼
Intent Detection
    │
    ▼
Knowledge Retrieval
    │
    ▼
Context Construction
    │
    ▼
LLM Processing
    │
    ▼
Response Generation
```

Potential metrics:

* Pipeline status
* Processing stage
* Response latency
* Errors
* Failed requests
* Provider usage
* Agent execution status

---

# 📊 Analytics

Analytics is available only to administrators.

The dashboard can provide insights into:

* Number of queries
* Active users
* Popular topics
* Response latency
* Pipeline performance
* AI provider usage
* Agent performance
* Knowledge retrieval performance

---

# 🛠️ Tech Stack

## Frontend

* React
* TypeScript
* Modern component-based UI
* Role-based routing

## AI Integration

* Ollama
* Gemma
* Anthropic
* Claude
* Provider abstraction layer

## AI Architecture

* Context-based prompting
* Retrieval-Augmented Generation architecture
* Agent-oriented design
* Modular AI services

## Monitoring

* Agent monitoring
* Pipeline monitoring
* Analytics and observability

---

# ▶️ How to Run the Project

## Prerequisites

Make sure the following are installed:

* Node.js 18 or later
* npm
* Git
* Ollama (optional but recommended for local AI)

Check your installation:

```bash
node -v
npm -v
git --version
```

---

# 1. Clone the Repository

```bash
git clone <your-repository-url>
```

Navigate to the project directory:

```bash
cd atlas-trainer
```

> Replace `<your-repository-url>` with the actual GitHub repository URL and `atlas-trainer` with your actual project folder name if different.

---

# 2. Install Dependencies

Install the project dependencies:

```bash
npm install
```

---

# 3. Configure Environment Variables

If your project includes an environment file, create one from the example:

```bash
cp .env.example .env
```

On Windows:

```powershell
Copy-Item .env.example .env
```

Add any required provider configuration.

Example:

```env
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=gemma2
```

If using Anthropic, add the required Anthropic configuration according to the application's implementation.

> Never commit real API keys to GitHub.

---

# 4. Start the Application

Run the development server:

```bash
npm run dev
```

The application will start on a local development URL, typically:

```text
http://localhost:5173
```

Open the displayed URL in your browser.

---

# 🦙 Running Atlas with Ollama

Ollama is the recommended default provider for running Atlas locally.

## Step 1 — Install Ollama

Install Ollama from:

[Ollama Download](https://ollama.com/download?utm_source=chatgpt.com)

Verify the installation:

```bash
ollama --version
```

---

## Step 2 — Download the Model

Pull the Gemma model:

```bash
ollama pull gemma2
```

For machines with lower memory:

```bash
ollama pull gemma2:2b
```

---

## Step 3 — Start Ollama

### macOS / Linux

```bash
OLLAMA_ORIGINS=* ollama serve
```

### Windows PowerShell

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

The Ollama API should run locally at:

```text
http://localhost:11434
```

---

## Step 4 — Verify Ollama

Check available models:

```bash
ollama list
```

You should see the downloaded model.

Example:

```text
NAME         ID          SIZE
gemma2       xxxxxxxx    ...
```

You can also test the model directly:

```bash
ollama run gemma2
```

Then type:

```text
Hello
```

If Ollama returns a response, the local model is working correctly.

Exit using:

```text
/bye
```

---

# 🔗 Connect Ollama to Atlas

Once both Atlas and Ollama are running:

1. Open Atlas in your browser.
2. Log in.
3. Navigate to **Ask Atlas**.
4. Click **Connect LLM**.
5. Select **Ollama**.
6. Enter:

```text
Base URL: http://localhost:11434
Model: gemma2
```

7. Click **Connect**.

Atlas should now route AI requests to the local Ollama model.

---

# ☁️ Running Atlas with Anthropic

Anthropic can be used as an alternative cloud provider.

## Step 1

Start the Atlas application:

```bash
npm run dev
```

## Step 2

Open:

```text
Ask Atlas → Connect LLM
```

## Step 3

Select:

```text
Provider: Anthropic
```

## Step 4

Enter the required API credentials according to the application's configuration.

Select the desired Claude model and click:

```text
Connect
```

Atlas will then route requests through the Anthropic provider.

---

# ⚡ Quick Start

For the fastest local setup:

## Terminal 1 — Start Atlas

```bash
git clone <your-repository-url>
cd atlas-trainer
npm install
npm run dev
```

## Terminal 2 — Start Ollama

```bash
ollama pull gemma2
```

Then start the server.

### macOS / Linux

```bash
OLLAMA_ORIGINS=* ollama serve
```

### Windows PowerShell

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

Finally, open:

```text
http://localhost:5173
```

Go to:

```text
Ask Atlas → Connect LLM
```

Configure:

```text
Provider: Ollama
URL: http://localhost:11434
Model: gemma2
```

Click **Connect** and start chatting.

---

# 🔐 Application Access

## User Login

The user portal provides:

```text
✓ Dashboard
✓ Ask Atlas
✓ Knowledge Repository
✗ Analytics
✗ Agent Monitor
✗ Pipeline Monitor
```

---

## Admin Login

The admin portal provides:

```text
✓ Dashboard
✓ Ask Atlas
✓ Knowledge Repository
✓ Analytics
✓ Agent Monitor
✓ Pipeline Monitor
✓ Administrative Features
```

---

# 🏭 Production Build

To build the application:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

# 🧪 Recommended Demo Setup

For the demonstration, open two terminals.

## Terminal 1

Start the Atlas application:

```bash
npm run dev
```

## Terminal 2

Start Ollama.

### macOS / Linux

```bash
OLLAMA_ORIGINS=* ollama serve
```

### Windows PowerShell

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

Then open the application.

Recommended demo flow:

```text
USER LOGIN
    │
    ▼
Show User Dashboard
    │
    ▼
Show Ask Atlas
    │
    ▼
Show Knowledge Repository
    │
    ▼
Show that Analytics / Agent Monitor /
Pipeline Monitor are unavailable
    │
    ▼
Logout
    │
    ▼
ADMIN LOGIN
    │
    ▼
Show Full Dashboard
    │
    ▼
Show Analytics
    │
    ▼
Show Agent Monitor
    │
    ▼
Show Pipeline Monitor
    │
    ▼
Open Ask Atlas
    │
    ▼
Connect Ollama
    │
    ▼
Ask a Question
```

---

# 🛠️ Troubleshooting

## Ollama is not connecting

Check whether Ollama is running:

```bash
ollama list
```

Check the API:

```bash
curl http://localhost:11434/api/tags
```

If Ollama is not running, restart it with CORS enabled.

### macOS / Linux

```bash
OLLAMA_ORIGINS=* ollama serve
```

### Windows PowerShell

```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

---

## Model Not Found

Download the model:

```bash
ollama pull gemma2
```

For a smaller model:

```bash
ollama pull gemma2:2b
```

Check available models:

```bash
ollama list
```

---

## Application Does Not Start

Delete dependencies and reinstall.

### macOS / Linux

```bash
rm -rf node_modules
npm install
npm run dev
```

### Windows PowerShell

```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

---

## Port Already in Use

If the default development port is occupied, Vite may automatically use another port.

Check the terminal output and open the displayed URL.

You can also explicitly run:

```bash
npm run dev -- --host 0.0.0.0
```

---

## Ollama Responses Are Slow

Local LLM speed depends on:

* CPU
* GPU availability
* Available RAM
* Model size

Try the smaller model:

```bash
ollama pull gemma2:2b
```

Then configure Atlas to use:

```text
gemma2:2b
```

---

# 🔮 Future Roadmap

Future improvements include:

* Real graph-based multi-agent orchestration
* Independent agent execution
* LangGraph integration
* Vector database integration
* Document ingestion pipeline
* Semantic search
* Persistent conversational memory
* Source-level citations
* Agent execution telemetry
* Feedback and evaluation framework
* Enterprise authentication
* Production database integration
* Additional LLM providers

---

# 🧩 Complete Architecture Summary

```text
                         ENTERPRISE USERS
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Authentication/RBAC  │
                    └───────────┬──────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
            ADMIN PORTAL                  USER PORTAL
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                           ASK ATLAS
                                │
                                ▼
                           CHAT SERVICE
                                │
                                ▼
                    CONTEXT / KNOWLEDGE LAYER
                                │
                                ▼
                       LLM ABSTRACTION
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 OLLAMA                  ANTHROPIC
                  LOCAL                    CLOUD
                    │                       │
                    └───────────┬───────────┘
                                ▼
                           AI RESPONSE
                                │
                                ▼
                              USER


                ADMIN OBSERVABILITY LAYER
                ─────────────────────────
                     • Analytics
                     • Agent Monitor
                     • Pipeline Monitor
```

---

# 📌 Project Methodology

Atlas follows four core architectural principles.

## 1. Modular Architecture

Responsibilities are separated into independent layers:

```text
Authentication
UI
Chat Service
Knowledge Layer
LLM Provider Layer
Monitoring
Analytics
```

---

## 2. Role-Based Access Control

Different users receive different levels of access.

```text
ADMIN
   ↓
Full System Visibility

USER
   ↓
Knowledge and AI Access
```

---

## 3. Provider Independence

The application does not depend on a single AI provider.

```text
Atlas
  │
  ▼
Provider Abstraction
  │
  ├── Ollama
  ├── Anthropic
  └── Future Providers
```

---

## 4. Agent-Oriented Architecture

AI responsibilities are logically separated:

```text
Understand
    ↓
Retrieve
    ↓
Remember
    ↓
Reason
    ↓
Verify
    ↓
Respond
```

---

# 📌 Conclusion

Atlas is an enterprise AI knowledge-enablement platform that combines:

* Separate Admin and User portals
* Role-Based Access Control
* AI-powered conversational assistance
* Centralized enterprise knowledge
* Local LLM support through Ollama
* Cloud LLM support through Anthropic
* Provider abstraction
* Agent-oriented architecture
* Retrieval-Augmented Generation methodology
* Agent monitoring
* Pipeline monitoring
* Analytics and observability

The current implementation establishes the functional foundation of the platform while providing a scalable architecture for future evolution into a fully graph-orchestrated, production-grade multi-agent enterprise AI system.
