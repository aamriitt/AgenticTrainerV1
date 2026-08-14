"""Readiness report generator — HTML (print-ready) and PDF from an assessment."""

from __future__ import annotations

import io
from datetime import datetime, timezone
from html import escape
from typing import Any

from fpdf import FPDF


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _check_value(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("value") or item.get("name") or item)
    return str(getattr(item, "value", item))


def _slug_filename(assessment: dict[str, Any], ext: str) -> str:
    tech = str(assessment.get("technology_type") or "upgrade").replace(" ", "-")
    current = str(assessment.get("current_version") or "current").replace(" ", "-")
    target = str(assessment.get("target_version") or "target").replace(" ", "-")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    safe = "".join(c if c.isalnum() or c in "-_." else "-" for c in f"{tech}_{current}_to_{target}")
    return f"rebootx-readiness-{safe}-{stamp}.{ext}"


def build_html_report(assessment: dict[str, Any]) -> str:
    """Build a standalone, print-friendly HTML readiness report."""
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    verdict = escape(str(assessment.get("verdict") or "Pending"))
    overall_risk = escape(str(assessment.get("overall_risk") or "—"))
    overall_score = assessment.get("overall_score")
    score_txt = f"{overall_score}/100" if overall_score is not None else "—"
    summary = escape(str(assessment.get("summary") or "No summary provided."))
    tech = escape(str(assessment.get("technology_type") or "—"))
    current = escape(str(assessment.get("current_version") or "—"))
    target = escape(str(assessment.get("target_version") or "—"))
    confidence = escape(str(assessment.get("confidence") or "—"))
    mode = escape(str(assessment.get("analysis_mode") or "—"))

    checks = [_check_value(c) for c in _as_list(assessment.get("validation_checks"))]
    checks_html = "".join(f"<li>{escape(c)}</li>" for c in checks) or "<li>None specified</li>"

    actions = [str(a) for a in _as_list(assessment.get("recommended_actions"))]
    actions_html = "".join(f"<li>{escape(a)}</li>" for a in actions) or "<li>None specified</li>"

    risk_rows: list[str] = []
    for risk in _as_list(assessment.get("risks")):
        if not isinstance(risk, dict):
            continue
        risk_checks = ", ".join(_check_value(c) for c in _as_list(risk.get("validation_checks"))) or "—"
        risk_rows.append(
            f"""
            <tr>
              <td>{escape(str(risk.get("priority") or "—"))}</td>
              <td>{escape(str(risk.get("score") if risk.get("score") is not None else "—"))}</td>
              <td>{escape(str(risk.get("risk_level") or "—"))}</td>
              <td>
                <strong>{escape(str(risk.get("title") or "Risk"))}</strong>
                <div class="muted">{escape(str(risk.get("category") or ""))}</div>
                <p>{escape(str(risk.get("explanation") or ""))}</p>
                <p><em>Recommendation:</em> {escape(str(risk.get("recommendation") or ""))}</p>
                <div class="muted">Checks: {escape(risk_checks)}</div>
              </td>
            </tr>
            """
        )
    risks_html = "".join(risk_rows) or "<tr><td colspan='4'>No risks identified.</td></tr>"

    verdict_class = (
        str(assessment.get("verdict") or "")
        .lower()
        .replace(" ", "-")
        .replace("/", "-")
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RebootX Readiness Report</title>
  <style>
    :root {{
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --bg: #ffffff;
      --panel: #f8fafc;
      --accent: #1d4ed8;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      color: var(--ink);
      background: var(--bg);
      line-height: 1.45;
    }}
    .page {{ max-width: 920px; margin: 0 auto; padding: 32px 28px 48px; }}
    header {{
      border-bottom: 3px solid var(--accent);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }}
    .brand {{ font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); font-weight: 700; }}
    h1 {{ margin: 6px 0 4px; font-size: 28px; }}
    .meta {{ color: var(--muted); font-size: 13px; }}
    .kpis {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 20px 0 28px;
    }}
    .kpi {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
    }}
    .kpi .label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }}
    .kpi .value {{ font-size: 20px; font-weight: 700; margin-top: 4px; }}
    .verdict-go {{ color: #047857; }}
    .verdict-go-with-caution {{ color: #0369a1; }}
    .verdict-caution {{ color: #b45309; }}
    .verdict-delay {{ color: #9a3412; }}
    .verdict-no-go {{ color: #b91c1c; }}
    h2 {{
      font-size: 16px;
      margin: 28px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--line);
    }}
    .summary {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 14px 16px;
    }}
    ul {{ padding-left: 18px; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    th, td {{
      border: 1px solid var(--line);
      padding: 10px;
      vertical-align: top;
      text-align: left;
    }}
    th {{ background: #f1f5f9; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }}
    .muted {{ color: var(--muted); font-size: 12px; margin-top: 4px; }}
    footer {{
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }}
    @media print {{
      body {{ background: white; }}
      .page {{ max-width: none; padding: 0; }}
      .kpi, .summary, tr {{ break-inside: avoid; }}
    }}
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div class="brand">RebootX · Tech Refresh Engine</div>
      <h1>Upgrade Readiness Assessment</h1>
      <div class="meta">Generated {escape(generated)} · Analysis mode: {mode}</div>
    </header>

    <div class="kpis">
      <div class="kpi">
        <div class="label">Verdict</div>
        <div class="value verdict-{escape(verdict_class)}">{verdict}</div>
      </div>
      <div class="kpi">
        <div class="label">Overall risk</div>
        <div class="value">{overall_risk}</div>
      </div>
      <div class="kpi">
        <div class="label">Risk score</div>
        <div class="value">{escape(score_txt)}</div>
      </div>
      <div class="kpi">
        <div class="label">Confidence</div>
        <div class="value">{confidence}</div>
      </div>
    </div>

    <h2>Upgrade scope</h2>
    <p><strong>Technology:</strong> {tech}<br/>
       <strong>Path:</strong> {current} → {target}</p>

    <h2>Executive summary</h2>
    <div class="summary">{summary}</div>

    <h2>Recommended validation checks</h2>
    <ul>{checks_html}</ul>

    <h2>Identified risks</h2>
    <table>
      <thead>
        <tr>
          <th style="width:8%">Priority</th>
          <th style="width:8%">Score</th>
          <th style="width:10%">Level</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        {risks_html}
      </tbody>
    </table>

    <h2>Recommended actions</h2>
    <ul>{actions_html}</ul>

    <footer>
      RebootX readiness report · For internal planning use · Not a substitute for CAB / change-management approval.
    </footer>
  </div>
</body>
</html>
"""


def _pdf_safe(text: str) -> str:
    """FPDF core fonts are Latin-1; normalize common Unicode for PDF output."""
    replacements = {
        "→": "->",
        "—": "-",
        "–": "-",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "•": "-",
        "⚠": "!",
        "🧠": "",
        "⚙️": "",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", errors="replace").decode("latin-1")


class _ReadinessPDF(FPDF):
    def header(self) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(29, 78, 216)
        self.cell(0, 8, "RebootX  |  Upgrade Readiness Assessment", align="L")
        self.ln(10)
        self.set_draw_color(29, 78, 216)
        self.set_line_width(0.6)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(6)
        self.set_x(self.l_margin)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 8, f"Page {self.page_no()}/{{nb}}  |  Internal planning use", align="C")


def _write(pdf: FPDF, text: str, *, size: int = 10, bold: bool = False, color=(15, 23, 42), h: float = 5.5) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B" if bold else "", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(pdf.epw, h, _pdf_safe(text))


def build_pdf_report(assessment: dict[str, Any]) -> bytes:
    """Build a PDF readiness report (bytes)."""
    pdf = _ReadinessPDF(format="A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    verdict = str(assessment.get("verdict") or "Pending")
    overall_risk = str(assessment.get("overall_risk") or "-")
    overall_score = assessment.get("overall_score")
    score_txt = f"{overall_score}/100" if overall_score is not None else "-"
    tech = str(assessment.get("technology_type") or "-")
    current = str(assessment.get("current_version") or "-")
    target = str(assessment.get("target_version") or "-")
    confidence = str(assessment.get("confidence") or "-")
    mode = str(assessment.get("analysis_mode") or "-")
    summary = str(assessment.get("summary") or "No summary provided.")

    _write(pdf, "Upgrade Readiness Report", size=18, bold=True, h=9)
    _write(pdf, f"Generated {generated}  |  Mode: {mode}", size=10, color=(100, 116, 139), h=6)
    pdf.ln(3)

    pdf.set_fill_color(248, 250, 252)
    kpi_line = (
        f"Verdict: {verdict}   |   Risk: {overall_risk}   |   "
        f"Score: {score_txt}   |   Confidence: {confidence}"
    )
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(pdf.epw, 8, _pdf_safe(kpi_line), fill=True)
    pdf.ln(3)

    _write(pdf, "Upgrade scope", size=12, bold=True, h=8)
    _write(pdf, f"Technology: {tech}\nPath: {current} -> {target}", size=10, h=6)
    pdf.ln(2)

    _write(pdf, "Executive summary", size=12, bold=True, h=8)
    _write(pdf, summary, size=10, h=5.5)
    pdf.ln(2)

    checks = [_check_value(c) for c in _as_list(assessment.get("validation_checks"))]
    _write(pdf, "Recommended validation checks", size=12, bold=True, h=8)
    if checks:
        for check in checks:
            _write(pdf, f"- {check}", size=10, h=5)
    else:
        _write(pdf, "- None specified", size=10, h=5)
    pdf.ln(2)

    _write(pdf, "Identified risks", size=12, bold=True, h=8)

    for risk in _as_list(assessment.get("risks")):
        if not isinstance(risk, dict):
            continue
        title = str(risk.get("title") or "Risk")
        priority = str(risk.get("priority") or "-")
        level = str(risk.get("risk_level") or "-")
        score = risk.get("score")
        score_part = f"score {score}" if score is not None else "score -"
        risk_checks = ", ".join(_check_value(c) for c in _as_list(risk.get("validation_checks"))) or "-"

        _write(pdf, f"[{priority}] {title}  ({level}, {score_part})", size=10, bold=True, h=5.5)
        _write(pdf, str(risk.get("explanation") or ""), size=9, color=(51, 65, 85), h=5)
        _write(
            pdf,
            f"Recommendation: {risk.get('recommendation') or ''}",
            size=9,
            color=(51, 65, 85),
            h=5,
        )
        _write(pdf, f"Checks: {risk_checks}", size=9, color=(100, 116, 139), h=5)
        pdf.ln(2)

    actions = [str(a) for a in _as_list(assessment.get("recommended_actions"))]
    _write(pdf, "Recommended actions", size=12, bold=True, h=8)
    if actions:
        for action in actions:
            _write(pdf, f"- {action}", size=10, h=5)
    else:
        _write(pdf, "- None specified", size=10, h=5)

    buffer = io.BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()


def report_filenames(assessment: dict[str, Any]) -> dict[str, str]:
    return {
        "html": _slug_filename(assessment, "html"),
        "pdf": _slug_filename(assessment, "pdf"),
        "json": _slug_filename(assessment, "json"),
    }
