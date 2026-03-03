# Self-hosting the Webstudio Builder

This guide explains how to run the Webstudio builder on your own server using
Docker Compose. All you need is a Linux host with Docker ≥ 24 and Compose v2.

> **Minimum requirements:** 2 GB RAM, 10 GB disk, Docker + Compose v2

---

## Quick start

```bash
# 1. Clone the repository (or just copy the deploy/ folder)
git clone https://github.com/webstudio-is/webstudio.git
cd webstudio

# 2. Create your env file from the template
cp deploy/.env.example deploy/.env

# 3. Edit the env file — change every value marked "change-me"
$EDITOR deploy/.env

# 4. Launch the stack
docker compose -f deploy/docker-compose.yml up -d

# 5. Open the builder
open http://localhost:3000
```

On first boot the `migrate` service applies all pending SQL migrations before
the `app` service starts, so the initial startup takes a few extra seconds.

---

## Environment variables

| Variable                                    | Required | Description                                                       |
| ------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                         | ✅       | Password for the internal PostgreSQL user                         |
| `DATABASE_URL`                              | ✅       | Full PostgreSQL connection URL (used by the app)                  |
| `DIRECT_URL`                                | ✅       | Direct PostgreSQL URL (used by migrations, bypasses pooler)       |
| `PGRST_JWT_SECRET`                          | ✅       | Shared secret for PostgREST JWT auth (≥ 64 chars)                 |
| `POSTGREST_API_KEY`                         | ✅       | Pre-signed JWT for anonymous PostgREST calls                      |
| `AUTH_SECRET`                               | ✅       | Secret used to sign session cookies                               |
| `DEV_LOGIN`                                 | —        | Set to `true` for password-based login (password = `AUTH_SECRET`) |
| `GH_CLIENT_ID` / `GH_CLIENT_SECRET`         | —        | GitHub OAuth credentials                                          |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | —        | Google OAuth credentials                                          |
| `FEATURES`                                  | —        | Feature flags (default `*` = all enabled)                         |
| `USER_PLAN`                                 | —        | Plan level for self-hosted users (default `pro`)                  |
| `MAX_ASSETS_PER_PROJECT`                    | —        | Upload limit per project (default `50`)                           |
| `S3_*`                                      | —        | S3-compatible storage credentials (omit to use local volume)      |

### Generating secrets

```bash
# AUTH_SECRET
openssl rand -hex 32

# PGRST_JWT_SECRET (must be at least 64 characters)
node -e "require('crypto').randomBytes(64).toString('hex') |> console.log"
```

### Generating POSTGREST_API_KEY

The `POSTGREST_API_KEY` is a JWT signed with `PGRST_JWT_SECRET` and the payload
`{"role":"anon"}`. Generate it with Node.js:

```bash
node -e "
const secret = process.env.PGRST_JWT_SECRET;
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({role:'anon'})).toString('base64url');
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', secret)
  .update(header + '.' + payload).digest('base64url');
console.log(header + '.' + payload + '.' + sig);
"
```

Or use an online tool such as [jwt.io](https://jwt.io) with:

- Algorithm: **HS256**
- Payload: `{"role":"anon"}`
- Secret: value of `PGRST_JWT_SECRET`

---

## Updating

```bash
docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d
```

The `migrate` service re-runs on every `up` and applies any new migrations
automatically before the app restarts.

---

## Deploying on Coolify

[Coolify](https://coolify.io) is an open-source self-hosting platform that
manages Traefik routing, SSL certificates, and deployments.

1. In your Coolify project, create a new service → **Docker Compose**.
2. Paste (or reference) the contents of `deploy/docker-compose.coolify.yml`.
3. Add every variable from `deploy/.env.example` as a Coolify environment
   variable. Coolify injects `COOLIFY_FQDN` automatically.
4. Click **Deploy**.

The `app` service uses `expose` (not `ports`) because Coolify's Traefik proxy
handles ingress and TLS termination.

---

## Architecture

```
                 ┌─────────────┐
  Browser ──────▶│    app      │:3000  (Remix + Vite, remix-serve)
                 └──────┬──────┘
                        │ SQL
                 ┌──────▼──────┐
                 │     db      │  PostgreSQL 15
                 └──────┬──────┘
                        │ PostgREST
                 ┌──────▼──────┐
                 │  postgrest  │  REST layer for the canvas
                 └─────────────┘
```

The `migrate` service (same image as `app`) runs `prisma migrate deploy` on
startup and exits. It applies all pending SQL migrations to the `db` service
before `app` is allowed to start.

> **Note on TypeScript data migrations:** The Prisma schema includes a handful
> of historical TypeScript data migrations (\*.ts files in the migrations folder).
> `prisma migrate deploy` processes SQL migrations only. For a fresh
> installation (empty database) this is fine — the TS migrations only transform
> data that doesn't exist yet. If you are migrating an existing database from a
> non-Docker environment, run the full custom migrations CLI first.

---

## Building the image locally

```bash
# Build for the current platform
docker build -f apps/builder/Dockerfile -t webstudio-builder:local .

# Test the full stack
cp deploy/.env.example deploy/.env

# Edit deploy/.env (change every "change-me" value), then:
BUILDER_IMAGE=webstudio-builder:local docker compose -f deploy/docker-compose.yml up

# Verify
curl http://localhost:3000
```

`BUILDER_IMAGE` overrides the default image (`ghcr.io/webstudio-is/builder:latest`) so
Compose uses your locally built image instead of pulling from the registry.

### Multi-architecture build (requires Docker Buildx)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f apps/builder/Dockerfile \
  -t webstudio-builder:local \
  --load \
  .
```
