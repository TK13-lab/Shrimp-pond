# 18 - Backup and operations

## Why backup matters

Database is now stored on server. This prevents data loss from phones, but creates a new responsibility:

```text
Server database must be backed up.
```

## Minimum backup plan for MVP

```text
Daily PostgreSQL backup
Keep last 7 daily backups
Keep last 4 weekly backups if possible
Store backup outside main server if possible
```

## Example backup command

```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Restore test

A backup is not useful unless restore works.

Monthly or before real use:

```text
Create test database
Restore latest backup
Verify users/materials/receipts/inventory exist
```

## Server monitoring minimum

For MVP, manually check:

```text
Disk space
Database container running
API container running
Last backup time
Server time zone
```

## Data correction policy

Do not edit database manually unless emergency.

For wrong receipt:

```text
Use REJECTED if not approved
Use VOIDED if already approved
Create reverse transaction if inventory was affected
```

## User offboarding

When staff leaves:

```text
Set isActive = false
Do not delete user
Keep audit logs
```

## Phone lost

Steps:

```text
Disable user account temporarily or revoke refresh tokens
Create new password
Install app on new phone
User logs in again
Data remains on server
```

## Password reset

Phase 1 can use admin reset:

```text
Admin changes user password
User logs in with new password
```

No public self-service password reset required in MVP.
