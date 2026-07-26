# 11 Agent State and Context

## 1. Overview
The Agentic Trainer uses LangGraph to manage the workflow. LangGraph requires a strongly typed state object that is passed between nodes (agents). This document defines the schema for the execution state and how memory is managed.

## 2. Shared State Schema
The state object holds all the necessary information for a single conversation turn.

```python
from typing import TypedDict, List, Optional, Any

class AgentState(TypedDict):
    # Core User Input
    user_query: str
    session_id: str
    
    # Intent and Routing
    intent: Optional[str]
    entities: List[str]
    confidence: float
    
    # RAG Context
    retrieved_docs: List[dict]  # List of chunks and metadata
    search_query_used: Optional[str]
    
    # Generation and Output
    draft_answer: Optional[str]
    final_answer: Optional[str]
    citations: List[dict]
    
    # State Management & Diagnostics
    chat_history: List[dict] # Short-term memory (last N messages)
    agent_trace: List[str]   # E.g. ["IntentAgent", "RetrievalAgent", "ReasoningAgent", "CitationAgent"]
    retry_count: int
    error_message: Optional[str]
```

## 3. State Transitions
As the `AgentState` moves through the graph, different agents mutate specific fields:
1. **User Node:** Populates `user_query` and `session_id`.
2. **Memory Node:** Fetches recent messages from Redis/Postgres and populates `chat_history`.
3. **Intent Agent:** Populates `intent`, `entities`, and `confidence`. Appends to `agent_trace`.
4. **Retrieval Agent:** Reads `intent` and `entities`, searches ChromaDB, populates `retrieved_docs` and `search_query_used`. Appends to `agent_trace`.
5. **Reasoning Agent:** Reads `retrieved_docs`, generates `draft_answer`. Appends to `agent_trace`.
6. **Citation Agent:** Formats `draft_answer`, populates `final_answer` and `citations`.

## 4. Memory Models

### 4.1 Short-Term Memory
- **Purpose:** Allow the user to ask follow-up questions (e.g., "Wait, what was step 2 again?").
- **Implementation:** The last 5 turns (User + AI) are passed into the `chat_history` field.
- **Handling:** If the `chat_history` exceeds the LLM context limit, the Memory Agent summarizes the older turns into a single "Conversation Summary" string.

### 4.2 Long-Term Memory (Future)
- **Purpose:** Remember user preferences across distinct sessions (e.g., "I always deploy to AWS, not Azure").
- **Implementation:** A separate persistent store where facts about the user are extracted and saved asynchronously at the end of a session, and injected into the System Prompt upon startup.
