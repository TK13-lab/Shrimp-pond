# Manager/Admin Web

Responsive web portal for `MANAGER` and `ADMIN` users.

The staff workflow stays in the Android mobile app. This web app uses the same NestJS REST API and never connects directly to PostgreSQL.

## Run Locally

Start the backend API first, then run:

```bash
cd apps/web
npm run dev
```

Open the printed URL, usually:

```text
http://127.0.0.1:8080
```

Local development defaults to:

```text
http://127.0.0.1:3000/api
```

You can change the API URL on the login screen.

## Current Screens

- submitted receipt queue
- receipt history with status/date filters
- receipt detail
- approve/reject submitted receipts
- void approved receipts
- inventory balance search

## Production

The production Caddy config serves this directory as a static site and proxies `/api/*` to the backend, so the web app can call the API through the same domain.
