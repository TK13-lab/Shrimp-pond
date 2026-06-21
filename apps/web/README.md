# Web Portal

Responsive web portal for `STAFF`, `MANAGER`, and `ADMIN` users.

Staff can log in on web to view materials, create purchase receipts, save drafts, submit receipts, and view their own receipt history. Manager and admin users can review submitted receipts, see inventory, and perform their existing management workflows. This web app uses the same NestJS REST API and never connects directly to PostgreSQL.

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

In production, the web portal calls `/api` through the same domain unless `window.SHRIMP_POND_API_BASE_URL` is configured before `src/main.js` loads.

## Current Screens

- submitted receipt queue
- staff receipt creation with material picker
- draft receipt save and submit
- active material list for staff entry
- receipt history with status/date filters
- receipt detail
- approve/reject submitted receipts
- void approved receipts
- inventory balance search
- admin-only user creation
- admin-only user disable and password reset

## Production

The production Caddy config serves this directory as a static site and proxies `/api/*` to the backend, so the web app can call the API through the same domain.
