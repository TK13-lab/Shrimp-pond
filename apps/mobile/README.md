# Mobile

React Native Expo app for staff, manager, and admin workflows.

Expected Phase 1 areas:

- login and secure token storage
- role-aware menu
- material list
- purchase receipt form
- own receipt history
- manager approval screens
- read-only inventory
- audit log view for manager/admin

The app should use clear Vietnamese labels, large controls, and simple navigation for farm conditions.

## API base URL

Set `EXPO_PUBLIC_API_BASE_URL` before running the app or creating an Android internal build.

Examples:

- Android emulator: `http://10.0.2.2:3000/api`
- iOS simulator: `http://127.0.0.1:3000/api`
- Physical device on LAN: `http://192.168.1.20:3000/api`
- Deployed backend: `https://api.your-domain.com/api`

Development still falls back to `http://127.0.0.1:3000/api` when the env var is missing. Internal APK builds do not use that fallback and will show a clear configuration error instead.

## Useful commands

```bash
npm run start
npm run start:lan
npm run typecheck
```

## Android internal build

- App name: `Shrimp Pond Mobile`
- Android package: `com.tk13lab.shrimppond`
- Internal build profile: `preview` in `eas.json`

Build steps:

1. Set `EXPO_PUBLIC_API_BASE_URL` to a deployed HTTPS backend or a LAN URL reachable from the phone.
2. If using remote EAS build, define the same `EXPO_PUBLIC_API_BASE_URL` in the EAS build environment.
3. First time only, sign in to Expo with `npx eas-cli login`.
4. Run `npm run build:android:preview`.
5. Install the generated APK on manager and staff phones for internal testing.

This setup is for internal distribution only in Phase 1. Do not submit it to Google Play yet.
