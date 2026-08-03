"""
Streamlit frontend for the Agentic Trainer.

Two views, selected via the sidebar:

1. "Ask" - the main chat interface. Upload knowledge files, ask
   questions, see grounded answers with citations, and give
   thumbs-up/down feedback.
2. "Admin (SME Review)" - the human-in-the-loop queue: review
   pending corrections from thumbs-down feedback, approve/reject,
   and trigger re-embedding of approved corrections.

Design notes
------------
- Talks to the FastAPI backend over HTTP (localhost:8000 by default)
  rather than importing the pipeline directly. This keeps the UI a
  true thin client and matches how a real deployment would separate
  frontend/backend processes.
- Run with: `streamlit run app/frontend/streamlit_app.py`
  (with the FastAPI backend already running via
  `uvicorn app.api:app --reload` in a separate terminal).
"""

from __future__ import annotations

import os

import requests
import streamlit as st

API_BASE_URL = os.getenv("AGENTIC_TRAINER_API_URL", "http://localhost:8000")

st.set_page_config(page_title="Agentic Trainer", page_icon="🎓", layout="wide")


def _api_get(path: str):
    try:
        r = requests.get(f"{API_BASE_URL}{path}", timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error(
            f"Can't reach the API backend at {API_BASE_URL}. "
            f"Make sure it's running: `uvicorn app.api:app --reload`"
        )
        st.stop()
    except requests.exceptions.HTTPError as e:
        st.error(f"API error: {e.response.json().get('detail', str(e))}")
        return None


def _api_post(path: str, json: dict | None = None, files: dict | None = None):
    try:
        r = requests.post(f"{API_BASE_URL}{path}", json=json, files=files, timeout=120)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error(
            f"Can't reach the API backend at {API_BASE_URL}. "
            f"Make sure it's running: `uvicorn app.api:app --reload`"
        )
        st.stop()
    except requests.exceptions.HTTPError as e:
        try:
            detail = e.response.json().get("detail", str(e))
        except Exception:
            detail = str(e)
        st.error(f"API error: {detail}")
        return None


def render_ask_view():
    st.title("🎓 Agentic Trainer")
    st.caption("Ask questions about your enterprise knowledge - SOPs, manuals, FAQs, training videos.")

    with st.sidebar:
        st.header("📚 Add Knowledge")
        uploaded = st.file_uploader(
            "Upload a PDF, DOCX, TXT/FAQ, or video file",
            type=["pdf", "docx", "txt", "mp4", "mov", "mkv", "wav", "mp3"],
        )
        if uploaded is not None and st.button("Index this file"):
            with st.spinner(f"Ingesting and indexing '{uploaded.name}'..."):
                result = _api_post(
                    "/upload",
                    files={"file": (uploaded.name, uploaded.getvalue())},
                )
            if result:
                st.success(f"Indexed {result['chunks_indexed']} chunks from '{result['filename']}'")

        st.divider()
        health = _api_get("/health")
        if health:
            st.metric("Vectors in knowledge base", health["vectors_stored"])

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    for entry in st.session_state.chat_history:
        with st.chat_message("user"):
            st.write(entry["question"])
        with st.chat_message("assistant"):
            st.write(entry["answer"])
            if entry["citations"]:
                with st.expander("📎 Sources"):
                    for c in entry["citations"]:
                        st.caption(f"• {c}")
            if not entry["refused"]:
                col1, col2, col3 = st.columns([1, 1, 6])
                feedback_id = entry["feedback_id"]
                already_rated = entry.get("rated", False)
                with col1:
                    if st.button("👍", key=f"up_{feedback_id}", disabled=already_rated):
                        _api_post(f"/feedback/{feedback_id}/up")
                        entry["rated"] = True
                        st.rerun()
                with col2:
                    if st.button("👎", key=f"down_{feedback_id}", disabled=already_rated):
                        entry["show_correction_box"] = True
                        st.rerun()

                if entry.get("show_correction_box") and not already_rated:
                    correction = st.text_area(
                        "What should be corrected?",
                        key=f"correction_{feedback_id}",
                    )
                    if st.button("Submit correction", key=f"submit_correction_{feedback_id}"):
                        if correction.strip():
                            _api_post(f"/feedback/{feedback_id}/down", json={"correction": correction})
                            entry["rated"] = True
                            entry["show_correction_box"] = False
                            st.success("Thanks - this has been sent for SME review.")
                            st.rerun()
                        else:
                            st.warning("Please describe what should be corrected.")

    question = st.chat_input("Ask a question about your enterprise knowledge...")
    if question:
        with st.chat_message("user"):
            st.write(question)
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                result = _api_post("/ask", json={"question": question})
            if result:
                st.write(result["answer"])
                if result["citations"]:
                    with st.expander("📎 Sources"):
                        for c in result["citations"]:
                            st.caption(f"• {c}")
                st.session_state.chat_history.append(
                    {
                        "question": question,
                        "answer": result["answer"],
                        "citations": result["citations"],
                        "refused": result["refused"],
                        "feedback_id": result["feedback_id"],
                    }
                )


def render_admin_view():
    st.title("🛡️ SME Review Queue")
    st.caption("Approve or reject corrections submitted via thumbs-down feedback.")

    analytics = _api_get("/admin/analytics")
    if analytics:
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Interactions", analytics["total_interactions"])
        c2.metric("👍 Thumbs Up", analytics["thumbs_up"])
        c3.metric("👎 Thumbs Down", analytics["thumbs_down"])
        c4.metric("Pending Review", analytics["pending_review"])

    st.divider()

    if st.button("🔄 Re-index approved corrections into knowledge base"):
        with st.spinner("Re-embedding approved corrections..."):
            result = _api_post("/admin/reindex")
        if result:
            st.success(f"Re-indexed {result['corrections_reindexed']} correction(s).")

    st.divider()

    pending = _api_get("/admin/pending") or []
    if not pending:
        st.info("No corrections currently awaiting review. 🎉")
        return

    for item in pending:
        with st.container(border=True):
            st.markdown(f"**Question:** {item['question']}")
            st.markdown(f"**Original answer:** {item['answer']}")
            st.markdown(f"**User's correction:** {item['correction']}")
            st.caption(f"Submitted: {item['created_at']}")

            comments = st.text_input("SME comments (optional)", key=f"comments_{item['id']}")
            col1, col2 = st.columns(2)
            with col1:
                if st.button("✅ Approve", key=f"approve_{item['id']}"):
                    _api_post(f"/admin/{item['id']}/approve", json={"sme_comments": comments})
                    st.rerun()
            with col2:
                if st.button("❌ Reject", key=f"reject_{item['id']}"):
                    _api_post(f"/admin/{item['id']}/reject", json={"sme_comments": comments})
                    st.rerun()


def main():
    st.sidebar.title("Navigation")
    view = st.sidebar.radio("Go to", ["Ask", "Admin (SME Review)"], label_visibility="collapsed")
    st.sidebar.divider()

    if view == "Ask":
        render_ask_view()
    else:
        render_admin_view()


if __name__ == "__main__":
    main()
