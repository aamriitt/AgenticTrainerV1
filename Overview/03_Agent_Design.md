# 03 Agent Design

## 1. Overview
The Agentic Trainer utilizes a multi-agent approach to handle complex queries. Each agent is a specialized LLM persona (powered by Gemma 3) with a specific role, distinct prompts, inputs, and outputs. They collaborate within a stateful LangGraph workflow.

## 2. Orchestrator Agent
- **Purpose:** The central router that coordinates the workflow, maintains conversation state, and determines the next step based on the outputs of other agents.
- **Responsibilities:** Receive user input, delegate tasks to sub-agents, handle fallbacks, and manage system memory.
- **Inputs:** User query, conversation history, current system state.
- **Outputs:** Next node to execute (e.g., Intent Agent, Reasoning Agent) or final answer to the user.
- **Decision Rules:** 
  - If intent is unknown, route to Intent Agent.
  - If context is missing, route to Retrieval Agent.
  - If context is present, route to Reasoning Agent.

## 3. Intent Agent
- **Purpose:** Analyze the user's query to determine its primary goal and extract any relevant entities or parameters.
- **Responsibilities:** Classify query into categories (`HOW_TO`, `DEBUG`, `DEFINITION`, `GREETING`, `UNCLEAR`).
- **Inputs:** User query, short-term history.
- **Outputs:** JSON object with `intent`, `entities`, and `confidence_score`.
- **Decision Rules:**
  - If `confidence_score` < 0.7, flag for Clarification Agent.
- **Prompt Template:**
  ```text
  You are an expert intent classifier for an enterprise knowledge system.
  Analyze the following user query and classify its intent.
  Query: {user_query}
  Return only JSON in the format: {"intent": "...", "entities": [...], "confidence_score": 0.0-1.0}
  ```

## 4. Retrieval Agent
- **Purpose:** Formulate optimal search queries for ChromaDB and filter the retrieved documents for relevance.
- **Responsibilities:** Keyword extraction, query expansion, vector search execution, and reranking.
- **Inputs:** Original query, extracted entities from Intent Agent.
- **Outputs:** List of top-K relevant document chunks with metadata (source, timestamp).
- **Decision Rules:**
  - If no documents exceed the similarity threshold, trigger fallback (tell user knowledge is unavailable).

## 5. Reasoning Agent
- **Purpose:** Synthesize a coherent, accurate answer based strictly on the retrieved context.
- **Responsibilities:** Read context, extract facts, resolve conflicting information (favoring recent timestamps), and draft the final response.
- **Inputs:** User query, retrieved document chunks.
- **Outputs:** Draft answer text, list of used source IDs.
- **Failure Conditions:** If the retrieved context does not contain the answer, it must state "I do not have enough information in the provided knowledge base."

## 6. Citation Agent
- **Purpose:** Format the Reasoning Agent's draft into a highly readable response with inline citations and links.
- **Responsibilities:** Append "[Source N]" tags to claims and generate a references section.
- **Inputs:** Draft answer, list of used source metadata.
- **Outputs:** Final formatted markdown string.

## 7. Clarification Agent
- **Purpose:** Prompt the user for more information when a query is ambiguous.
- **Responsibilities:** Generate a polite, specific question to narrow down the user's intent.
- **Inputs:** Ambiguous query, intent analysis showing low confidence.
- **Outputs:** A clarifying question presented to the user.

## 8. Memory Agent
- **Purpose:** Manage short-term and long-term conversation history.
- **Responsibilities:** Summarize long threads to save context window space, extract persistent user preferences.

## 9. Feedback Agent
- **Purpose:** Process explicit user feedback (thumbs down, written corrections).
- **Responsibilities:** Log feedback against specific document chunks for SME review.
