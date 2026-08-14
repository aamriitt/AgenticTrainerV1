# Release Checklist

Gate checklist for promoting application changes from UAT to production. Tailored for synthetic **DemoBenefits Portal** releases.

## Release information

| Field | Value |
|-------|-------|
| Release ID | 2024.06 |
| Change type | Bug fix + monitoring |
| Rollback owner | Taylor Brooks |
| Maintenance window | Sat 2024-06-22 02:00–04:00 UTC |

---

## Pre-release (T-5 business days)

- [ ] Change ticket approved by change advisory board
- [ ] UAT sign-off complete ([uat-test-plan.md](uat-test-plan.md))
- [ ] Release notes drafted for helpdesk and users
- [ ] Rollback plan documented and tested in staging
- [ ] Database migration scripts reviewed (if applicable)
- [ ] Vendor dependencies confirmed (none for this release)

## Pre-release (T-1 day)

- [ ] Deploy release candidate to staging; run smoke tests
- [ ] Execute SQL data quality baseline on staging
- [ ] Confirm on-call rotation and escalation contacts
- [ ] Send stakeholder comms with window and expected impact
- [ ] Verify monitoring dashboards and alerts active

## Release day — before deploy

- [ ] Confirm maintenance window start with ops
- [ ] Snapshot / backup verification complete
- [ ] Freeze non-emergency changes in target environment
- [ ] Open bridge line or chat channel for war room
- [ ] Record production metric baselines (error rate, queue depth, latency)

## Release day — during deploy

- [ ] Deploy application artifacts per runbook
- [ ] Run database migrations with timing logged
- [ ] Execute post-deploy smoke tests:
  - [ ] Health endpoint returns 200
  - [ ] SSO login (synthetic test account)
  - [ ] Single enrollment submission in prod smoke org
- [ ] Run targeted SQL checks ([sql-data-quality-checks.md](sql-data-quality-checks.md))

## Release day — go / no-go

| Check | Owner | Pass? |
|-------|-------|-------|
| Smoke tests | App support | |
| Error rate within baseline | Ops | |
| No P1/P2 tickets opened | Helpdesk | |
| Business owner verbal OK | Product | |

**No-go:** execute rollback plan, notify stakeholders, schedule retrospective.

## Post-release (0–72 hours hypercare)

- [ ] Monitor per [post-deployment-monitoring.md](post-deployment-monitoring.md)
- [ ] Daily stand-up during hypercare period
- [ ] Confirm helpdesk KB articles published
- [ ] User training comms sent if UI changed ([user-training-guide.md](user-training-guide.md))
- [ ] Close change ticket with outcome summary

## Rollback procedure (summary)

1. Stop traffic to new version (load balancer toggle)
2. Redeploy previous artifact tag (`v2024.05`)
3. Reverse migration if safe; otherwise restore DB snapshot
4. Re-run smoke tests and SQL checks
5. Document incident ticket if rollback triggered by defect

## Artifacts to archive

- Deployment log
- Test results
- SQL check outputs
- Sign-off emails
- Updated runbooks

## Related documents

- [Incident Triage Runbook](incident-triage-runbook.md)
- [Post-Deployment Monitoring](post-deployment-monitoring.md)
