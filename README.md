# Context Vault MCP Connector

Live MCP endpoint: `https://context-vault-v1.vercel.app/mcp`

This repo provides an MCP server (Vercel serverless) with tools for health, play listing, run creation, ASSET assembly, status updates, and asset banking, plus a Workbench UI (Vite/React) deployed at the root.

## Prerequisites
- Node 18+ (Node 22 OK; avoid experimental ESM flags by using provided scripts)
- pnpm or npm (repo uses pnpm-lock; npm works via scripts)
- A Neon Postgres database (connection string)
- Vercel account (to deploy serverless + static UI)

## Environment variables
Create `.env` in repo root (do not commit):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
ALLOWED_WORKSPACE_ID=client_123_syndicate
```

## Installation
```sh
npm install
npx prisma generate
```

## Seeding the Workbook Play
Runs the “Workbook Module Drafting (v1)” play and core blocks into your DB:
```sh
node prisma/seed-workbook-module.cjs
```

## Run locally
Serverless-style dev:
```sh
npx vercel dev
```
or just run the MCP server entry for API routes via your runner. The static UI builds to `web/dist`.

## Build
```sh
npm run build
```
This generates Prisma client, compiles server TS, and builds the web UI to `web/dist`.

## Deploy to Vercel
- Ensure Vercel project is linked to this repo/branch and auto-deploy is on.
- Set env vars in Vercel: `DATABASE_URL`, `ALLOWED_WORKSPACE_ID`.
- `vercel.json` rewrites `/mcp` → `/api/mcp.ts` and serves `web/dist` at root; additional API routes are under `/api/*`.

## MCP tools exposed
- `cv_health_check` – DB + server ping
- `cv_list_plays` – lists plays for workspace
- `cv_create_run` – creates a run (task_goal + play)
- `cv_update_run_status` – update run status (PENDING/IN_PROGRESS/PASS/FAIL)
- `cv_assemble_asset` – builds ASSET prompt from run context (play/core blocks/shape)
- `cv_bank_asset` – stores asset linked to a run

MCP URL for clients: `https://context-vault-v1.vercel.app/mcp`

## Workbench UI (browser)
Deployed at root. Phased flow:
1) Start Run: select play (radios), enter task goal, view context preview, Start Run.
2) Job Execution: shows run ID, status control, assemble ASSET.
3) Finalize & Bank: approve output, set PASS, bank asset.

Fallbacks: UI uses REST endpoints when MCP host runtime isn’t injected.

## REST endpoints (for UI fallback)
- `GET /api/plays?workspace_id=...`
- `GET /api/play-details?play_id=...`
- `POST /api/runs` (create run)
- `POST /api/run-status` (update run status)
- `POST /api/assemble-asset`
- `POST /api/bank-asset`
- `GET /api/health`

## ChatGPT MCP connector
Use MCP URL `https://context-vault-v1.vercel.app/mcp` in Apps & Connectors. No auth currently.

## Notes
- Workspace scoping enforced via `ALLOWED_WORKSPACE_ID`.
- Neon adapter is used for Prisma; ensure `DATABASE_URL` is set before running scripts.
- If Prisma client missing, run `npx prisma generate`.
