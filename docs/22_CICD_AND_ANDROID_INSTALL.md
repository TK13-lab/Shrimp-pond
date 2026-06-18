# 22 - CI/CD and Android install

## What is automated

GitHub Actions has two workflows:

- `CI`: runs on pull requests and pushes to `main`.
- `Android Preview Build`: manual workflow that triggers an internal Android APK build on EAS.

The CI workflow checks:

- backend dependencies install with `npm ci`
- Prisma schema validates
- Prisma client generates
- migrations apply to PostgreSQL
- backend TypeScript compiles
- backend Nest app bootstraps
- mobile dependencies install with `npm ci`
- Expo config is readable
- mobile TypeScript compiles

## Required GitHub secret

Add this repository secret before running the Android preview workflow:

```text
EXPO_TOKEN
```

Create it from the Expo dashboard or EAS CLI, then add it in:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

## Required EAS environment variable

The mobile app needs the API URL at build time. Do not commit `.env.local`.

Create this EAS environment variable for the `preview` environment:

```bash
cd apps/mobile
npx eas-cli env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.your-domain.com/api --environment preview --visibility plaintext
```

Use a real HTTPS backend URL when possible. For LAN-only testing, the value can be a server LAN IP reachable by the Android phones, for example:

```text
http://192.168.1.20:3000/api
```

## First EAS setup

Run one interactive EAS build locally before relying on GitHub Actions. This lets EAS create the project and Android signing credentials.

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

After that, GitHub Actions can trigger preview builds non-interactively.

## Build APK from GitHub Actions

1. Open the repository on GitHub.
2. Go to `Actions`.
3. Select `Android Preview Build`.
4. Click `Run workflow`.
5. Open the EAS build link printed in the workflow logs.
6. Download the APK from the EAS build page.

## Install on Android phone

1. Make sure the backend URL in `EXPO_PUBLIC_API_BASE_URL` is reachable from the phone.
2. Send the APK link/file to the staff phone.
3. Open the APK on the phone.
4. Allow install from this source when Android asks.
5. Install and log in with a demo or real user.

If the app opens but cannot log in, check the API URL first. A phone cannot use `127.0.0.1` to reach the backend on your computer or server.

## Recommended product path

Keep React Native Expo as the primary app for farm operations.

Use Android APK internal distribution for staff first. For manager/admin on iOS, use the same Expo codebase later with TestFlight or EAS iOS internal distribution. A web admin panel can be added later for heavier back-office tasks, but it should not replace the mobile app in Phase 1.
