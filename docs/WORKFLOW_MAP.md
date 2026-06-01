# Workflow Map

This file maps the project documentation to the working folder layout.

## Folder Layout

```text
.
├── AGENTS.md
├── README.md
├── project.toml
├── config/
├── data_links/
├── docs/
├── logs/
├── outputs/
│   └── checkpoints/
├── cache/
├── scripts/
│   ├── figures/
│   ├── helpers/
│   ├── preprocess/
│   ├── archive/
│   └── setup/
└── apps/
    ├── api/
    │   ├── prisma/
    │   │   └── migrations/
    │   ├── src/
    │   │   ├── auth/
    │   │   ├── users/
    │   │   ├── farms/
    │   │   ├── materials/
    │   │   ├── purchase-receipts/
    │   │   ├── inventory/
    │   │   ├── audit-logs/
    │   │   └── common/
    │   │       ├── decorators/
    │   │       ├── guards/
    │   │       └── dto/
    │   └── test/
    └── mobile/
        ├── assets/
        └── src/
            ├── screens/
            │   ├── auth/
            │   ├── menu/
            │   ├── materials/
            │   ├── purchaseReceipts/
            │   ├── approvals/
            │   ├── inventory/
            │   ├── auditLogs/
            │   └── users/
            ├── components/
            ├── navigation/
            ├── api/
            ├── auth/
            ├── types/
            └── utils/
```

## Documentation Entry Points

- Project brief: `docs/00_PROJECT_BRIEF.md`
- Architecture: `docs/01_ARCHITECTURE_DECISION.md`
- Phase 1 requirements: `docs/03_PHASE1_SCOPE_REQUIREMENTS.md`
- Roles and permissions: `docs/04_ROLES_AND_PERMISSIONS.md`
- Receipt workflow: `docs/05_RECEIPT_WORKFLOW_AND_DUPLICATE_CONTROL.md`
- Prisma schema draft: `docs/06_DATABASE_SCHEMA_PRISMA.md`
- Backend API spec: `docs/07_BACKEND_API_SPEC.md`
- Mobile app spec: `docs/08_MOBILE_APP_SPEC.md`
- Sprint tasks: `docs/11_SPRINT_TASKS_FOR_CODEX.md`
- Acceptance tests: `docs/13_ACCEPTANCE_TEST_PLAN.md`

## Development Flow

1. Pick one task from the sprint board.
2. Inspect only the relevant docs and source folders.
3. Implement the smallest working slice.
4. Run compile/start/tests for the touched app.
5. Update this map and `docs/PROJECT_STATUS.md` when the workflow materially changes.
6. Commit the completed step locally.
7. Push the commit to GitHub.

## Git Remote

Use this remote for the project:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

If needed, configure it once with:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

After every completed and verified step:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

In this lab workspace, `.git` is read-only and plain `git` may resolve to the parent lab repository. Use the local wrapper when working here:

```bash
scripts/setup/git-shrimp add .
scripts/setup/git-shrimp commit -m "<type>(scope): <short description>"
scripts/setup/git-shrimp push origin main
```

Do not commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
