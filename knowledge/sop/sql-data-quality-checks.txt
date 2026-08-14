# SQL Data Quality Checks

Reusable SQL patterns for validating application data after incidents, releases, or scheduled batch jobs. All table and column names are **synthetic** and illustrative.

## When to run checks

| Trigger | Recommended checks |
|---------|-------------------|
| After enrollment batch | Pending age, orphan records, duplicate enrollments |
| After auth/SSO deploy | Session table growth, failed login spike |
| After reporting release | Export job failures, stale aggregates |
| Weekly scheduled | Full suite in read-only replica |

Run against a **read replica** or snapshot when possible. Never run destructive queries in production.

---

## Enrollment module

### Pending records older than threshold

Identifies enrollments stuck in `pending` — useful for INC-240601-style incidents.

```sql
-- Synthetic schema: demo_enrollment.enrollments
SELECT
    enrollment_id,
    member_id,
    status,
    created_at,
    TIMESTAMPDIFF(HOUR, created_at, UTC_TIMESTAMP()) AS hours_pending
FROM demo_enrollment.enrollments
WHERE status = 'pending'
  AND created_at < UTC_TIMESTAMP() - INTERVAL 1 HOUR
ORDER BY created_at;
```

**Pass criteria:** Zero rows, or documented exceptions with ticket reference.

### Orphan enrollment lines (missing parent)

```sql
SELECT e.enrollment_id
FROM demo_enrollment.enrollment_lines e
LEFT JOIN demo_enrollment.enrollments p ON e.enrollment_id = p.enrollment_id
WHERE p.enrollment_id IS NULL;
```

**Pass criteria:** Zero rows.

### Duplicate active enrollments per member

```sql
SELECT member_id, plan_code, COUNT(*) AS active_count
FROM demo_enrollment.enrollments
WHERE status IN ('active', 'pending')
GROUP BY member_id, plan_code
HAVING COUNT(*) > 1;
```

**Pass criteria:** Zero rows unless business rules allow concurrent pending.

---

## Authentication module

### Failed login spike (last hour)

```sql
SELECT
    DATE_FORMAT(event_time, '%Y-%m-%d %H:00') AS hour_bucket,
    COUNT(*) AS failed_logins
FROM demo_auth.login_events
WHERE outcome = 'failure'
  AND event_time >= UTC_TIMESTAMP() - INTERVAL 1 HOUR
GROUP BY hour_bucket;
```

Compare against 7-day baseline. Alert if > 3× normal.

### Stale sessions not cleaned up

```sql
SELECT COUNT(*) AS stale_session_count
FROM demo_auth.sessions
WHERE expires_at < UTC_TIMESTAMP()
  AND revoked_at IS NULL;
```

**Pass criteria:** Below housekeeping threshold (e.g., < 1000); run cleanup job if exceeded.

---

## Reporting module

### Failed export jobs (24 hours)

```sql
SELECT job_id, report_name, requested_by, error_message, completed_at
FROM demo_reporting.export_jobs
WHERE status = 'failed'
  AND completed_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
ORDER BY completed_at DESC;
```

### Aggregate freshness

```sql
SELECT aggregate_name, MAX(refreshed_at) AS last_refresh
FROM demo_reporting.daily_aggregates
GROUP BY aggregate_name
HAVING MAX(refreshed_at) < UTC_TIMESTAMP() - INTERVAL 26 HOUR;
```

**Pass criteria:** All aggregates refreshed within 26 hours (allows for batch window).

---

## Notification module

### Undelivered messages backlog

```sql
SELECT channel, COUNT(*) AS backlog_count
FROM demo_notify.outbound_messages
WHERE status IN ('queued', 'retry')
  AND created_at < UTC_TIMESTAMP() - INTERVAL 30 MINUTE
GROUP BY channel;
```

Correlates with queue consumer health checks during P2 incidents.

---

## Check execution log (recommended)

Track every run in an audit table:

```sql
INSERT INTO demo_ops.data_quality_runs
    (check_name, module, run_at, row_count, passed, ticket_ref)
VALUES
    ('pending_enrollment_age', 'Enrollment', UTC_TIMESTAMP(), :row_count, :passed, :ticket_ref);
```

## Integration with support workflow

1. **Triage** — run targeted check matching reported module
2. **Verification** — re-run after fix before resolving ticket
3. **Release** — include checks in [Release Checklist](release-checklist.md)
4. **Monitoring** — automate high-value checks; see [Post-Deployment Monitoring](post-deployment-monitoring.md)

## Portfolio note

Adapt table names to your demo database schema. The patterns (pending age, orphans, duplicates, freshness) transfer across SQL dialects with minor syntax changes.
