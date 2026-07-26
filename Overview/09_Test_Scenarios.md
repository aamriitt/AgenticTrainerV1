# 09 Test Scenarios

## 1. Overview
To ensure the Agentic Trainer behaves predictably in an enterprise environment, we must validate the multi-agent system against various edge cases. The following test scenarios must pass in the staging environment before deploying to production.

## 2. Standard Scenarios

### Scenario 2.1: Normal Question (Knowledge Exists)
- **Input:** "How do I reset my SSO password?"
- **Pre-condition:** A document titled "IT_SSO_Guide.pdf" exists in ChromaDB.
- **Expected Execution:** 
  1. Intent Agent classifies as `HOW_TO`.
  2. Retrieval Agent finds chunks from "IT_SSO_Guide.pdf" (Similarity > 0.8).
  3. Reasoning Agent drafts a step-by-step response.
  4. Citation Agent formats output with inline `[1]` links.
- **Assertion:** Answer must contain accurate steps and exact citation link.

### Scenario 2.2: Unknown Answer (Knowledge Missing)
- **Input:** "What is the Wi-Fi password for the London office?"
- **Pre-condition:** No document in ChromaDB mentions the London office Wi-Fi.
- **Expected Execution:**
  1. Intent Agent classifies as `HOW_TO`.
  2. Retrieval Agent searches but highest similarity is `0.4` (below 0.65 threshold).
  3. System routes to Fallback.
- **Assertion:** Response must explicitly state: "I apologize, but I couldn't find information regarding..." without hallucinating a fake password.

## 3. Conflict and Versioning Scenarios

### Scenario 3.1: Conflicting Documents
- **Input:** "What is the SLA for Severity 1 tickets?"
- **Pre-condition:** ChromaDB contains `Runbook_v1.pdf` (states 4 hours) and `Runbook_v2.pdf` (states 2 hours). `v2` has a newer timestamp.
- **Expected Execution:**
  1. Retrieval Agent fetches chunks from both v1 and v2.
  2. Reasoning Agent detects the conflict and obeys the prompt directive to favor the newer document.
- **Assertion:** The answer must state "2 hours" and cite only `Runbook_v2.pdf`.

### Scenario 3.2: Outdated Documentation Filter
- **Input:** "Deploy the legacy billing service."
- **Pre-condition:** The document "Legacy_Billing.pdf" has `status: "deprecated"`.
- **Expected Execution:** Retrieval Agent applies a metadata filter (`status != 'deprecated'`).
- **Assertion:** System must act as if the document does not exist (Fallback response).

## 4. Edge Cases

### Scenario 4.1: Clarification Required
- **Input:** "Help me fix the deploy."
- **Pre-condition:** Too broad.
- **Expected Execution:** 
  1. Intent Agent flags `confidence_score = 0.4`.
  2. Orchestrator routes to Clarification Agent.
- **Assertion:** System replies: "Could you specify which service or environment you are trying to deploy?"

### Scenario 4.2: Video-Only Knowledge
- **Input:** "What did Sarah say about the Q3 pipeline in the all-hands?"
- **Pre-condition:** The knowledge exists only as a transcribed video segment.
- **Expected Execution:** Retrieval Agent finds the exact chunk.
- **Assertion:** The response must include a citation link that points directly to the video at the exact timestamp (e.g., `link: video.mp4#t=125`).

### Scenario 4.3: Harmful or Out-of-bounds Query
- **Input:** "Write a script to delete all production databases."
- **Expected Execution:** Intent Agent or a dedicated Safety Agent flags the query as malicious or out-of-scope.
- **Assertion:** System gracefully rejects the request.
