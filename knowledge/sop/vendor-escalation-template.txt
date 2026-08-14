# Vendor Escalation Template

Structured template for escalating issues to third-party vendors. Copy, fill in bracketed fields, and attach to the support ticket.

---

## Escalation email template

**Subject:** `[P{1-4}] {Vendor Product} — {Brief issue description} — Ticket {INC-XXXXXX}`

**To:** `{vendor-support@example.com}`  
**CC:** `{internal-stakeholders}`

---

Hello {Vendor} Support,

We are escalating a production issue affecting the **{Module}** module of our application environment.

### Account / contract information

| Field | Value |
|-------|-------|
| Customer name | Demo Org (synthetic) |
| Contract / account ID | DEMO-ACC-44821 |
| Support tier | Premium 24×7 |
| Primary contact | Alex Kim — alex.kim@demo-org.example |

### Incident summary

| Field | Value |
|-------|-------|
| Internal ticket | {INC-240620} |
| Severity | {P1 / P2 / P3 / P4} |
| First observed (UTC) | {2024-06-20 06:15} |
| Current status | {Waiting vendor / In progress} |
| Users impacted | {Approx count or percentage} |
| Business impact | {e.g., All SSO users unable to complete login} |

### Problem description

{Clear, factual description of symptoms. Avoid internal jargon.}

**Example (synthetic):**

After a CDN configuration update on 2024-06-19, Safari 17 users enter an infinite redirect loop following SSO callback. Chrome and Firefox unaffected. Issue began at approximately 06:15 UTC.

### Steps to reproduce

1. {Step one}
2. {Step two}
3. {Observed result}

### Troubleshooting already performed

- [ ] Verified issue occurs on multiple networks and devices
- [ ] Collected HAR file from affected browser session
- [ ] Compared response headers Chrome vs Safari
- [ ] Rolled back CDN change — issue persists (cookie already issued)
- [ ] Internal ticket: {link}

### Logs and evidence

| Artifact | Location |
|----------|----------|
| HAR capture | Attached: `safari-sso-loop.har` |
| Sample correlation ID | `corr-8f3a2b1c-demo` |
| CDN change ticket | `CHG-8842` |

### Requested action

Please advise on:

1. Root cause of SameSite cookie handling change affecting Safari
2. Hotfix or configuration workaround with timeline
3. Permanent fix target version

### SLA reference

Per support agreement section {X.Y}, we request:

- **Initial vendor response:** within {1 hour for P1}
- **Workaround or ETA:** within {4 hours for P1}

### Next internal update

We will update stakeholders at **{time UTC}** or upon vendor response, whichever is sooner.

Thank you,  
{Your name}  
{Title} — Demo Org Application Support  
{Phone / chat handle}

---

## Internal escalation log (paste in ticket)

| Date (UTC) | Action | Vendor response |
|------------|--------|-----------------|
| | Escalation opened | |
| | Vendor ack received | |
| | Workaround provided | |
| | Fix deployed | |

## Severity guidance for vendor comms

| Severity | Include in subject | Phone follow-up |
|----------|-------------------|-----------------|
| P1 | `[P1]` + phone call within 30 min | Yes |
| P2 | `[P2]` | If no ack in 1 hour |
| P3/P4 | Standard queue | Email sufficient |

## Synthetic example: INC-240620

Filled escalation for Safari SSO redirect loop:

- **Vendor:** IdentityCloud (fictional)
- **Severity:** P1
- **Impact:** ~40% of users (Safari on macOS/iOS)
- **Workaround:** Use Chrome/Firefox until patch
- **Vendor commit:** Patch v3.2.1 on 2024-06-22 maintenance window

See demo ticket `GET /api/tickets` (filter module=Authentication) in the optional app.

## Related documents

- [Incident Triage Runbook](incident-triage-runbook.md)
- [Release Checklist](release-checklist.md)
- [Post-Deployment Monitoring](post-deployment-monitoring.md)
