# User Training Guide

End-user training outline for the synthetic **DemoBenefits Portal**. Suitable for helpdesk-led webinars or self-service LMS modules.

## Training objectives

After completing this module, users will be able to:

1. Log in securely via organizational SSO
2. Submit and track enrollment applications
3. Recognize normal processing times vs. issues requiring support
4. Export standard reports within supported date ranges
5. Contact helpdesk with the information support needs

## Audience

| Segment | Format | Duration |
|---------|--------|----------|
| New members | Live webinar + recording | 45 min |
| Returning users (delta) | 10-min video per release | 10 min |
| Helpdesk staff | Internal deep dive | 90 min |

## Module 1: Getting started

### Login

1. Navigate to `https://portal.demo-benefits.example`
2. Click **Sign in with SSO**
3. Complete MFA on corporate identity provider
4. Land on personal dashboard

**Common issue:** Browser redirect loop — try Chrome/Firefox; see KB-AUTH-017 (synthetic).

### Dashboard overview

| Area | Purpose |
|------|---------|
| My Enrollments | Active and pending applications |
| Documents | Notices and confirmations |
| Profile | Contact preferences |

## Module 2: Submitting an enrollment

1. Select **Enroll → Choose Plan**
2. Review plan summary and effective date rules
3. Complete required fields (all marked with *)
4. Submit and save confirmation number
5. Expect confirmation email within **15 minutes** during business hours

> **Training tip:** Explain that `pending` status up to 1 hour can be normal after batch processing. Contact helpdesk if pending exceeds 2 hours.

## Module 3: Checking application status

| Status | Meaning | User action |
|--------|---------|-------------|
| Pending | Awaiting processing | Wait; refresh after 30 min |
| Confirmed | Enrollment active | None |
| Action needed | Missing information | Open task and respond |
| Cancelled | Withdrawn or expired | Start new if still eligible |

## Module 4: Reports (admin users)

1. Go to **Reports → Enrollment Activity**
2. Select date range **≤ 90 days** for standard export
3. Choose CSV or PDF
4. Large ranges may time out — split into quarters

## Module 5: Getting help

When contacting helpdesk, provide:

- Full name and member ID
- Confirmation or enrollment number
- Screenshot of error (no PHI in public channels)
- Date/time issue occurred (with timezone)

**Helpdesk:** Log ticket with correct module (Enrollment, Authentication, Reporting) per [incident triage runbook](incident-triage-runbook.md).

## Quick reference card (handout)

```
DemoBenefits Portal — Quick Help
─────────────────────────────────
Portal:  portal.demo-benefits.example
Helpdesk: support@demo-org.example | 555-0100
Hours:   Mon–Fri 8am–6pm local

Pending enrollment > 2 hours? Call helpdesk.
Export > 90 days? Split date range.
Login issues? Try Chrome; clear cookies.
```

## Trainer checklist

- [ ] Use synthetic accounts only in demos
- [ ] Show both happy path and pending state
- [ ] Point to KB articles for known release changes
- [ ] Collect feedback survey after session
- [ ] Update slides when [release checklist](release-checklist.md) includes UI changes

## Assessment (optional)

| Question | Correct answer |
|----------|----------------|
| How long should users wait before calling about pending? | ~2 hours |
| Max recommended report range? | 90 days |
| What info should users include in support requests? | Member ID, enrollment #, screenshot, timestamp |

## Related documents

- [Incident Triage Runbook](incident-triage-runbook.md)
- [UAT Test Plan](uat-test-plan.md)
