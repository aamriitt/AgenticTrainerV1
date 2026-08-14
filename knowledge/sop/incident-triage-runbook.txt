# Incident Triage Runbook

Operational guide for triaging application support incidents. All examples use synthetic systems and fictional organizations.

## Purpose

Provide a consistent, repeatable process so any support analyst can classify, prioritize, and route incidents within defined SLA windows.

## Severity definitions

| Severity | Impact | Example (synthetic) | Initial response | Resolution target |
|----------|--------|---------------------|------------------|-------------------|
| **P1** | System down or critical security issue; no workaround | SSO login loop affects all users | 15 minutes | 4 hours |
| **P2** | Major feature degraded; workaround available | Enrollment emails delayed | 30 minutes | 8 business hours |
| **P3** | Minor feature issue; limited users | Report export slow for 90+ day range | 4 business hours | 3 business days |
| **P4** | Cosmetic, documentation, enhancement | Typo on help page | 1 business day | Next release cycle |

## Triage checklist

Complete within the **initial response** window for the assigned severity.

- [ ] **Confirm ticket metadata** — title, module, reporter, environment (prod/stage)
- [ ] **Validate severity** — adjust up or down with brief justification in ticket notes
- [ ] **Check status page / monitoring** — correlate user report with metrics ([monitoring guide](post-deployment-monitoring.md))
- [ ] **Search known issues** — review last 30 days of resolved tickets and KB articles
- [ ] **Attempt reproduction** — follow steps in lower environment when safe
- [ ] **Assign owner** — app support analyst or on-call engineer
- [ ] **Communicate** — post initial update to reporter and stakeholders
- [ ] **Escalate if needed** — use [vendor template](vendor-escalation-template.md) when root cause is external

## Routing matrix

| Module | Primary owner | Escalation path |
|--------|---------------|-----------------|
| Authentication | Identity team | SSO vendor |
| Enrollment | Benefits app team | Integration vendor |
| Reporting | Analytics team | Database admin |
| Notifications | Platform team | Email/SMS vendor |

## Communication templates

### Initial acknowledgment (all severities)

```
Ticket {number} received — {title}
Severity: {P1-P4}
Module: {module}
We are investigating and will update within {SLA window}.
```

### P1/P2 escalation notice

```
Ticket {number} escalated to {team/vendor}.
Impact: {user count / business function}
Workaround: {steps or "none available"}
Next update: {time UTC}
```

## Synthetic walkthrough: INC-240601

**Report:** 12 enrollment records stuck in `pending`; emails not sent.

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Helpdesk logs ticket, module = Enrollment | INC-240601 created |
| 2 | Analyst validates P2 — batch delayed, manual enrollment still works | Severity confirmed |
| 3 | Check queue depth metric — elevated since 07:45 UTC | Correlates with report |
| 4 | Assign to Alex Kim (Enrollment on-call) | Owner assigned |
| 5 | Alex identifies consumer pod crash-loop | Root cause found |
| 6 | Replay DLQ, restart consumer | 12/12 records processed |
| 7 | Run SQL pending-age check — all clear | Verification complete |
| 8 | Resolve with follow-up alert task | Ticket closed |

## After resolution

1. Document root cause, resolution, and follow-up in the ticket
2. Update KB if the issue is likely to recur
3. Add or tune monitoring alerts
4. Review whether severity SLA was met; note process improvements

## Related documents

- [SQL Data Quality Checks](sql-data-quality-checks.md)
- [Vendor Escalation Template](vendor-escalation-template.md)
- [Post-Deployment Monitoring](post-deployment-monitoring.md)
