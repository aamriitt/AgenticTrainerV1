# 07 Feedback and Learning

## 1. Overview
The Agentic Trainer is not a static system; it must learn and improve over time. However, because we do not fine-tune the LLM weights directly (to preserve general reasoning capabilities and avoid catastrophic forgetting), all "learning" happens at the knowledge base (RAG) and prompt level.

## 2. User Feedback Mechanisms
Users interact with the UI and provide two forms of feedback:
- **Implicit:** Clicking on citation links (indicates the answer was helpful and the user wanted more details).
- **Explicit:** Thumbs up / Thumbs down buttons on generated answers. If a user clicks Thumbs Down, a modal prompts them to provide a written correction (e.g., "This runbook is outdated, we use v3 now.")

## 3. The Feedback Workflow

1. **Ingestion:** User submits a correction via the UI.
2. **Logging:** The FastAPI backend logs the feedback against the specific `source_id` and the generated answer in a database (e.g., PostgreSQL).
3. **SME Notification:** An async job flags the feedback for review by a Subject Matter Expert (SME) in an admin dashboard.
4. **Validation:** The SME reviews the user's comment. They can:
   - **Accept:** The SME uploads the new document (e.g., Runbook v3).
   - **Reject:** The SME dismisses the feedback.
   - **Edit:** The SME directly edits the chunk metadata in ChromaDB to add an "addendum" or mark the old document as deprecated.

## 4. Knowledge Base Updates
When a SME approves an update:
- **Deprecation:** The old document chunks are marked with `status: "deprecated"` in ChromaDB. They are not deleted immediately to preserve history, but the Retrieval Agent is instructed to filter out deprecated chunks.
- **Embedding Regeneration:** The new document is processed through the ingestion pipeline (Whisper/OCR -> Chunking -> Embedding -> ChromaDB).
- **Version Bumping:** The `version` metadata field is incremented. The Reasoning Agent naturally favors higher version numbers.

## 5. System Prompts Updates
If a pattern of poor reasoning is detected (e.g., the LLM keeps confusing "staging" and "production" environments despite having the right context), administrators can update the **Few-Shot Examples** in the Prompts configuration. 
- The Feedback Agent aggregates common failure modes.
- Admins add a specific positive/negative example to the Reasoning Agent's prompt template to correct the behavior.

## 6. Obsolete Document Removal
A scheduled background job runs monthly to physically delete chunks from ChromaDB that have been marked as `deprecated` for more than 90 days, keeping the vector store performant and cost-effective.
