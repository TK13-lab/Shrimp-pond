# 16 - Decision log

Use this file to record important decisions.

## Decision 001 - Use client-server architecture

Date: 2026-06-01

Decision:

```text
Use mobile app + backend API + PostgreSQL server.
```

Reason:

```text
Avoid data loss when phone is lost.
Support multiple staff entering data.
Enable role-based permissions.
Enable audit log and duplicate prevention.
```

Consequences:

```text
Need backend deployment.
Need authentication.
Need server backup.
Mobile needs network for real submission.
```

---

## Decision 002 - Do not update inventory from mobile

Date: 2026-06-01

Decision:

```text
Inventory changes only on backend after manager/admin approves receipt.
```

Reason:

```text
Prevent staff errors from directly corrupting inventory.
Allow manager to review before stock changes.
Ensure transaction and audit log.
```

---

## Decision 003 - Use receipt approval workflow

Date: 2026-06-01

Decision:

```text
DRAFT -> SUBMITTED -> APPROVED/REJECTED
```

Reason:

```text
Multiple staff may enter data.
Manager needs final control.
```

---

## Decision 004 - Use idempotency key

Date: 2026-06-01

Decision:

```text
Mobile sends client_request_id for create requests.
Backend stores unique(user_id, client_request_id).
```

Reason:

```text
Prevent duplicate receipt creation if user taps submit twice or network retries.
```

---

## New decisions

Add below.

---

## Decision 005 - Commit and push after every step

Date: 2026-06-01

Decision:

```text
After every completed and verified step/task, commit locally and push to GitHub.
Remote: git@github.com:TK13-lab/Shrimp-pond.git
```

Reason:

```text
Preserve progress after each small working slice.
Keep the solo developer's local work backed up on GitHub.
Make Codex-assisted changes easier to review and roll back.
```

Constraints:

```text
Never commit .env, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
```
