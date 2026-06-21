# 23 - VPS Deploy

This deploy target runs the production API, PostgreSQL, and HTTPS reverse proxy on one VPS.

## Server Requirements

- Ubuntu 24.04 VPS
- Public IPv4 address
- A domain pointing to the VPS, for example `example.com`
- Ports `80` and `443` open in the VPS firewall

## First Deploy

Install Docker on the VPS, then clone the repository:

```bash
git clone git@github.com:TK13-lab/Shrimp-pond.git
cd Shrimp-pond/deploy/production
cp .env.example .env
```

Edit `.env` with the real domains, email, database password, and JWT secret.

Start the stack:

```bash
docker compose up -d --build
```

Check the API:

```bash
curl https://example.com/api/health
```

Expected response:

```json
{"service":"shrimp-pond-api","status":"ok"}
```

Open the manager/admin web portal:

```text
https://example.com
```

The web portal calls the API through the same domain at `/api`.

## Seed Demo Users

Only seed demo users on a test/staging server:

```bash
docker compose exec api npm run prisma:seed
```

Do not seed demo users on a real production server unless you immediately change or disable them.

## Update API

For later deployments:

```bash
git pull
cd deploy/production
docker compose up -d --build api
```

The PostgreSQL data stays in the `shrimp_pond_postgres_data` Docker volume.

## Android APK API URL

Build the Android APK with:

```text
EXPO_PUBLIC_API_BASE_URL=https://example.com/api
```

Phones on any Wi-Fi or mobile data network can use the app as long as the domain is reachable.

## Manager/Admin Web

The Caddy service mounts `apps/web` as static files. Updates to web files are deployed with:

```bash
git pull
cd deploy/production
docker compose up -d caddy
```
