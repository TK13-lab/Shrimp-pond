# TODO Checklist

Date created: 2026-06-01

Use this file to mark completed tasks and reduce confusion between planning and execution.

## Sprint 0 - Project setup

- [x] S0-T1 Create project structure
- [x] S0-T2 Create backend NestJS app
- [x] S0-T3 Create PostgreSQL Docker Compose
- [x] S0-T4 Create mobile Expo app

## Sprint 1 - Auth and roles

- [x] S1-T1 Prisma schema base
- [x] S1-T2 Seed demo data
- [x] S1-T3 Auth module
- [x] S1-T4 Guards
- [x] S1-T5 Mobile auth

## Sprint 2 - Materials

- [x] S2-T1 Material schema and migration
- [x] S2-T2 Material API
- [x] S2-T3 Mobile material screens

## Sprint 3 - Purchase receipt creation and submission

- [x] S3-T1 Receipt schema
- [x] S3-T2 Receipt create API
- [x] S3-T3 Receipt submit API
- [x] S3-T4 Receipt list/detail API
- [x] S3-T5 Mobile receipt form
- [x] S3-T6 Mobile receipt list/detail

## Sprint 4 - Approval and inventory

- [x] S4-T1 Inventory schema
- [x] S4-T2 Approve receipt API
- [x] S4-T3 Reject receipt API
- [x] S4-T4 Void receipt API
- [x] S4-T5 Inventory API
- [x] S4-T6 Mobile manager approval screens
- [x] S4-T7 Mobile inventory screen

## Sprint 5 - Internal deployment hardening

- [x] S5-T1 Error handling and Vietnamese messages
- [x] S5-T2 Network error handling on mobile
- [ ] S5-T3 Security review
- [ ] S5-T4 Android build
- [ ] S5-T5 Demo script

## Notes

- After each completed and verified task, update this checklist.
- Also update `docs/PROJECT_STATUS.md` when the workflow or status materially changes.
- In this lab workspace, use `scripts/setup/git-shrimp ...` for Git actions if plain `git` resolves to the parent repository.
- In this WSL setup, Docker is provided through Docker Desktop on the Windows host via `scripts/setup/docker-host`.
