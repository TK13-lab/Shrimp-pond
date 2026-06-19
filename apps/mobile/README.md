# Mobile

React Native Expo app for staff receipt-entry workflows.

Expected Phase 1 areas:

- login and secure token storage
- role-aware menu
- material list
- purchase receipt form
- own receipt history

Manager/admin workflows now live in `apps/web`.

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
npm run web
npm run typecheck
```

## Browser preview

You can preview the mobile app in a desktop browser and make it look like a phone screen.

Recommended local setup:

1. Start PostgreSQL and the NestJS API.
2. Run the Expo web preview:

```bash
cd apps/mobile
npm run web
```

3. Open the local URL shown by Expo in Chrome.
4. Press `F12`, then `Ctrl+Shift+M` to enable the mobile device frame.
5. Choose a device preset like `iPhone 14 Pro` or `Pixel 7`.

For local browser preview on the same machine, this API base URL works well:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api
```

The web preview uses browser local storage for the saved session so sign-in and screen-to-screen testing work in development.

## Android internal build

- App name: `Shrimp Pond Mobile`
- Android package: `com.tk13lab.shrimppond`
- Internal build profile: `preview` in `eas.json`

Build steps:

1. Set `EXPO_PUBLIC_API_BASE_URL` in the EAS `preview` environment to a deployed HTTPS backend or a LAN URL reachable from the phone.
2. If building locally for development, `.env.local` may be used, but do not commit it.
3. First time only, sign in to Expo with `npx eas-cli login`.
4. Run `npm run build:android:preview`.
5. Install the generated APK on staff phones for internal testing.

This setup is for internal distribution only in Phase 1. Do not submit it to Google Play yet.

See `docs/22_CICD_AND_ANDROID_INSTALL.md` for the GitHub Actions build workflow and Android install checklist.
