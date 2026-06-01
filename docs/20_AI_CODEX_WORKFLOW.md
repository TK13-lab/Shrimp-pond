# 20 - AI/Codex workflow

## Principle

Codex is a junior developer, not the project owner.

You decide architecture and scope. Codex implements small tasks.

## Recommended loop

```text
1. Pick one task from sprint board
2. Ask Codex to inspect relevant files
3. Ask Codex to propose plan
4. Approve plan
5. Let Codex implement
6. Run app/tests manually
7. Ask Codex to fix specific errors
8. Commit changes locally
9. Push changes to GitHub
```

## Good prompt style

Good:

```text
Implement POST /api/purchase-receipts with idempotency using the existing Prisma schema. Do not modify mobile app.
```

Bad:

```text
Make the app work.
```

## When Codex fails

Do not ask it to redo everything.

Ask:

```text
The backend fails with this error: <paste error>. Inspect only files related to Prisma and purchase receipt service. Fix the error without changing API behavior.
```

## Commit strategy

Commit locally and push after each completed, verified working slice.

Repository remote:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

If `origin` is missing, set it once:

```bash
git remote add origin git@github.com:TK13-lab/Shrimp-pond.git
```

After each step:

```bash
git add .
git commit -m "<type>(scope): <short description>"
git push origin main
```

Example commit messages:

```text
feat(api): setup auth
feat(mobile): add login screen
feat(api): add materials module
feat(api): add receipt creation
feat(api): add inventory approval transaction
```

Never commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.

## Manual testing first

Before writing automated tests, use manual acceptance tests in `docs/13_ACCEPTANCE_TEST_PLAN.md`.

## Do not let Codex add these without approval

```text
Firebase
Supabase
GraphQL
Redux if not needed
Complex offline sync
Push notifications
Camera permissions
Location permissions
Payment SDKs
Analytics SDKs
```

## Red flags in generated code

Review if Codex:

```text
Stores password as plain text
Stores token in AsyncStorage
Puts database URL in mobile code
Lets staff approve receipt
Updates inventory when staff submits receipt
Deletes receipts from database
Does not use transaction for approval
Uses floating point for money in backend
Skips validation
```
