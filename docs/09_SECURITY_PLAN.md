# 09 - Security plan

## Security goals

Protect:

- User accounts
- Purchase receipt data
- Inventory data
- Audit trail
- Server database credentials
- Business data if phone is lost

## Threats considered in Phase 1

```text
- Lost phone
- Staff entering duplicate data
- Staff trying to approve own receipt
- User using old token after account is disabled
- Mobile app exposing secrets
- Backend endpoint missing permission check
- Database update partially completed
- Inventory updated twice for same receipt
```

## Authentication

Use username/password.

Password storage:

```text
bcrypt or argon2 hash
Never store plain text password
```

Token:

```text
JWT access token
Optional refresh token
```

Access token should be short-lived.

Refresh token should be stored hashed on server if implemented.

## Mobile token storage

Use secure storage.

Do not store tokens in plain AsyncStorage.

## Authorization

Backend must enforce role checks.

Do not rely only on UI.

Every endpoint should check:

```text
- Authenticated user
- Active user
- Role
- Farm ownership
- Entity status
```

## HTTPS

Staging/production backend must use HTTPS.

For local LAN testing, HTTP may be used temporarily, but never for production.

## Input validation

Validate on backend:

```text
- Required fields
- Numeric ranges
- Date format
- Receipt status transitions
- Role permissions
- Farm ownership
```

Reject:

```text
quantity <= 0
unit empty
material name empty
unit price < 0
receipt without items
```

## Database transactions

Use database transaction for approval:

```text
Approve receipt
Create inventory transactions
Update inventory balance
Write audit log
```

All must succeed or all must fail.

## Duplicate prevention

Use:

```text
client_request_id
idempotency key table
unique constraints
approval idempotency
disabled submit button on mobile
```

## Audit logs

Log important actions:

```text
LOGIN
CREATE_RECEIPT
UPDATE_RECEIPT
SUBMIT_RECEIPT
APPROVE_RECEIPT
REJECT_RECEIPT
VOID_RECEIPT
CREATE_MATERIAL
UPDATE_MATERIAL
DISABLE_MATERIAL
CREATE_USER
DISABLE_USER
```

Log fields:

```text
user_id
farm_id
action
entity_type
entity_id
old_value_json
new_value_json
device_id
ip_address
created_at
```

## No hard delete

Do not hard-delete:

```text
users
materials
receipts
inventory transactions
```

Use:

```text
is_active = false
status = VOIDED
```

## Secrets

Never commit:

```text
.env
DATABASE_URL
JWT_SECRET
ADMIN_PASSWORD
PRODUCTION_KEYS
```

Provide only:

```text
.env.example
```

## Rate limiting

For login endpoint, add basic rate limit if possible:

```text
Max failed attempts per username/IP
Return generic login error
```

## Production checklist

Before real deployment:

```text
- HTTPS enabled
- Strong JWT secret
- Database password not default
- Admin password changed
- Backups configured
- Logs not leaking tokens
- CORS restricted
- Server firewall configured
- Database not exposed publicly
```
