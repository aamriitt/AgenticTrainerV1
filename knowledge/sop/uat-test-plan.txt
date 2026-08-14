# UAT Test Plan

User Acceptance Testing plan template for application changes. Uses synthetic application **DemoBenefits Portal** and fictional test users.

## Document control

| Field | Value |
|-------|-------|
| Release | 2024.06 — Enrollment queue reliability |
| UAT lead | Jordan Lee |
| Environment | UAT (`https://uat.demo-benefits.example`) |
| Test window | 2024-06-18 to 2024-06-20 |

## Scope

### In scope

- Enrollment submission and confirmation email delivery
- Batch status visibility on admin dashboard
- Error messaging when downstream queue unavailable

### Out of scope

- SSO changes (separate release)
- Mobile app (not in this build)

## Entry criteria

- [ ] Code deployed to UAT with release tag `v2024.06-rc2`
- [ ] Smoke tests passed in CI
- [ ] SQL data quality baseline captured ([sql-data-quality-checks.md](sql-data-quality-checks.md))
- [ ] Test accounts provisioned (see below)
- [ ] Known defects documented with severity

## Test accounts (synthetic)

| Role | Username | Purpose |
|------|----------|---------|
| Member | `uat.member01@example.com` | Submit enrollment |
| Admin | `uat.admin01@example.com` | View batch status |
| Helpdesk | `uat.helpdesk@example.com` | Verify ticket workflow |

Passwords stored in team password manager — never commit credentials to git.

## Test cases

| ID | Scenario | Steps | Expected result | Priority |
|----|----------|-------|-----------------|----------|
| UAT-01 | Happy path enrollment | Member submits new plan enrollment | Status = confirmed; email within 5 min | P1 |
| UAT-02 | Pending visibility | Admin views enrollment batch dashboard | Pending count matches DB check | P1 |
| UAT-03 | Queue unavailable | Simulate queue down in UAT | User sees friendly error; no duplicate submit | P2 |
| UAT-04 | DLQ replay | Ops replays test message | Record moves pending → confirmed | P2 |
| UAT-05 | Regression: login | Member logs in via SSO | Successful redirect to dashboard | P1 |
| UAT-06 | Report export 30 days | Admin exports enrollment report | PDF completes < 60 seconds | P3 |

### UAT-01 detail

1. Log in as `uat.member01@example.com`
2. Navigate to **Enroll → New Plan**
3. Select **Demo Gold Plan**, effective date first of next month
4. Submit application
5. Verify confirmation screen displays enrollment ID
6. Check email inbox within 5 minutes
7. Run SQL pending-age check — record must not appear

## Defect management

| Severity | UAT action |
|----------|------------|
| Blocker | Stop UAT; fix required before sign-off |
| Major | Sign-off blocked unless approved exception |
| Minor | Document; may defer to next release |

Log defects with: ID, test case, steps, screenshot, environment, assigned developer.

## Exit criteria

- [ ] All P1 test cases passed
- [ ] ≥ 95% P2 test cases passed (waivers documented)
- [ ] No open blocker defects
- [ ] Business owner sign-off received
- [ ] Release checklist pre-stage completed

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Business owner | Pat Chen (fictional) | | |
| UAT lead | Jordan Lee | | |
| App support | Alex Kim | | |

## Related documents

- [Release Checklist](release-checklist.md)
- [User Training Guide](user-training-guide.md)
- [Post-Deployment Monitoring](post-deployment-monitoring.md)
