# Local Git Setup

This project is pushed to:

```text
git@github.com:TK13-lab/Shrimp-pond.git
```

## Current Lab Workspace

In this lab workspace, the `.git` path is managed by the environment and is read-only. Because of that, plain `git` commands may resolve to the parent lab repository instead of this project.

Use the project wrapper:

```bash
scripts/setup/git-shrimp status
scripts/setup/git-shrimp add .
scripts/setup/git-shrimp commit -m "<type>(scope): <short description>"
scripts/setup/git-shrimp push origin main
```

The wrapper uses `.git-shrimp/` as local Git metadata and keeps the working tree at the project root.

## Normal Clone

In a normal clone from GitHub, use standard Git commands:

```bash
git clone git@github.com:TK13-lab/Shrimp-pond.git
cd Shrimp-pond
git status
```

Do not commit `.env`, secrets, raw data, heavy outputs, logs, caches, or machine-specific files.
