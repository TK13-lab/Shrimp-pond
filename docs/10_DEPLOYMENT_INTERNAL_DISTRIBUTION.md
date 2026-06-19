# 10 - Internal deployment and distribution

## Goal

Deploy internally for farm staff, manager, and admin.

This does not mean public App Store / Google Play release in Phase 1.

## Deployment targets

### Backend

Options:

```text
- VPS
- Local server at farm office
- Cloud VM
```

Recommended for MVP:

```text
Ubuntu VPS
Docker Compose
PostgreSQL
NestJS API
Caddy/Nginx reverse proxy
HTTPS
```

### Mobile Android

Use internal APK or internal distribution.

Goal:

```text
Build Android file that can be installed on staff phones.
```

### Manager/Admin Web

Serve `apps/web` as a responsive web portal.

Manager and admin should use the web portal for approvals, receipt history, and inventory. Do not make iOS/TestFlight a blocking target unless the web portal later proves insufficient.

## Local development

Backend:

```bash
cd apps/api
npm install
docker compose up -d
npm run prisma:migrate
npm run start:dev
```

Mobile:

```bash
cd apps/mobile
npm install
npx expo start
```

Web:

```bash
cd apps/web
npm run dev
```

## Environment variables

Backend `.env`:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shrimp_pond
JWT_SECRET=replace_with_long_random_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

Mobile `.env` or app config:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

Web defaults to `http://127.0.0.1:3000/api` locally and to same-domain `/api` in production.

For real phone testing on LAN, use the server or computer LAN IP:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.xxx:3000/api
```

For deployed backend:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com/api
```

## Android internal build

Use Expo/EAS when ready.

Expected result:

```text
APK or Android internal build
```

Week 1 target:

```text
Install and test on 1-2 Android phones
```

Current repo preparation:

```text
Android package: com.tk13lab.shrimppond
Build profile: apps/mobile/eas.json -> preview
Output type: APK for internal install
```

Recommended steps:

```bash
cd apps/mobile
npm install
npx eas-cli login
npm run build:android:preview
```

Before the build, set `EXPO_PUBLIC_API_BASE_URL` to a backend URL reachable from the phone:

- Prefer deployed HTTPS for the most stable internal build.
- For farm LAN testing, use the server LAN IP, not `127.0.0.1`.
- If using remote EAS build, set `EXPO_PUBLIC_API_BASE_URL` in the EAS `preview` environment.

CI/CD setup and Android install steps are documented in:

```text
docs/22_CICD_AND_ANDROID_INSTALL.md
```

## Server backup

Minimum:

```text
Daily PostgreSQL dump
Keep at least 7 backups
Store backup outside the server if possible
```

## Deployment checklist

```text
Backend starts
Database migration applied
Seed users created
Login works
Staff can create receipt
Manager can approve receipt
Inventory updates after approval
Audit log recorded
Android build connects to server
No secrets committed
```
