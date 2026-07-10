# PC Builder PH — Dev Environment

Node.js monorepo (npm workspaces) with three packages:

```
pc-builder/
├── scraper/          Node.js — hits Shopee v4 API, writes to Postgres
├── api/              Express — REST API reading from Postgres
├── frontend/         React + Vite — PC builder UI
├── postgres/init/    SQL schema, auto-run on first Docker start
├── docker-compose.yml
└── scripts/setup.js  Cross-platform prerequisite checker + .env generator
```

## First-time setup

```bash
# 1. Check prerequisites and generate .env files (auto-detects OS)
node scripts/setup.js

# 2. Install all workspace dependencies
npm install

# 3. Start Postgres
docker compose up -d

# 4. Start API + frontend together
npm run dev
```

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:4000 |
| Postgres | localhost:5432 |
| n8n (when enabled) | http://localhost:5678 |

## Running a scrape

```bash
# Fill SHOPEE_COOKIE in scraper/.env first
npm run scrape
```

Data lands in Postgres (`items` + `price_snapshots` tables) and is
immediately visible in the frontend on next API call.

## Switching machines

The setup is stateless across machines — `.env` files are gitignored, so:
1. Clone the repo on the new machine
2. Run `node scripts/setup.js` again — it re-generates `.env` files
3. `npm install && docker compose up -d && npm run dev`

Postgres data lives in a Docker named volume (`pcbuilder_postgres`), so
it persists across container restarts on the same machine. To move data
between machines, `pg_dump` / `pg_restore`.

## Enabling n8n

Uncomment the `n8n` service block in `docker-compose.yml`, then:

```bash
docker compose up -d
```

n8n will be available at http://localhost:5678. From there, set up a Cron
workflow that runs `npm run scrape` on a schedule (Execute Command node or
HTTP call to a thin wrapper endpoint on the API).
