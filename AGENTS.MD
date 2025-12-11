# Context Vault Agents Guide

This repo ships a Vercel-hosted MCP server plus fallback REST routes and a small React Workbench UI. Use this guide when wiring agents (MCP clients or scripted callers) into the system.

## Primary entrypoint: MCP
- Endpoint: `https://context-vault-v1.vercel.app/mcp` (server id `context-vault-mcp`).
- Workspace guard: if `ALLOWED_WORKSPACE_ID` is set, callers must match it; otherwise pass `workspace_id` explicitly.
- Tools:
  - `cv_health_check` → sanity for MCP + database.
  - `cv_list_plays` → list available Plays for a workspace.
  - `cv_create_run` → create a Run for a Play with `task_goal` (+ optional config_json).
  - `cv_assemble_asset` → assemble the ASSET prompt for a Run (uses Play core blocks, task goal, shape).
  - `cv_update_run_status` → set Run status (`PENDING | IN_PROGRESS | PASS | FAIL`).
  - `cv_bank_asset` → bank a final output for a Run (one asset per run).
  - `cv_ingest_context` → extract intent from raw text; optional `bank` to store canon blocks.
  - `cv_approve_intent` → bank WHY/WHAT/CONSTRAINTS canon, write intent note, create tasks.

### Common agent flows
- Play/run/asset loop: `cv_list_plays` → `cv_create_run` → work → `cv_assemble_asset` → `cv_update_run_status` (PASS) → `cv_bank_asset`.
- Intent loop: `cv_ingest_context` with raw text → (optionally) `cv_approve_intent` to persist canon, note, and tasks.
- All flows respect workspace scoping; send the `workspace_id` you expect and handle 403/404s as auth failures.

## REST fallback (UI uses these when MCP is unavailable)
- `GET /api/plays?workspace_id=...`
- `GET /api/play-details?play_id=...`
- `POST /api/runs` { play_id, workspace_id, task_goal, config_json? }
- `POST /api/run-status` { run_id, new_status }
- `POST /api/assemble-asset` { run_id }
- `POST /api/bank-asset` { run_id, asset_title, output_content }
- `POST /api/ingest-context` { raw_text, workspace_id?, bank? }
- `POST /api/approve-intent` { intent, workspace_id?, client_ref?, project_ref?, play_ref?, run_ref?, note_ref? }
- Health: `GET /api/health`

## Local dev cheat sheet
- Prereqs: Node 18+, Postgres (Neon ok). Env vars: `DATABASE_URL`, `ALLOWED_WORKSPACE_ID` (optional guard).
- Install/build: `npm install`, then `npx prisma generate`, run locally with `npx vercel dev`. Build all with `npm run build`.
- Seeding: `node prisma/seed-workbook-module.cjs` to load sample play/core blocks.
- Key source:
  - MCP server and tool definitions: `src/index.ts`
  - Intent processing helpers: `src/lib/*`
  - Serverless API routes: `api/*.ts`
  - UI Workbench: `web/src/WorkbenchWidget.tsx`
- If Prisma client errors, regenerate with `npx prisma generate`; ensure `DATABASE_URL` is set before DB calls.

## Data model highlights (prisma/schema.prisma)
- `Play` (workflow) links to `CoreBlock` (canon/secondary context), `Run`, `Asset`.
- `Run` references optional `Shape` (structured output), `Dab` (agent role), status, config JSON.
- `Asset` is one-per-run; `Note` stores intent summaries; `Task` stores action items.

## Operational notes
- MCP and REST both enforce workspace scoping; mismatches return 403/404 rather than leaking data.
- Asset banking forces idempotency (one asset per run); update run status to `PASS` before banking in the UI flow.
- UI prefers MCP functions exposed via the ChatGPT connector (`window.openai.connector`), falling back to REST; agents can follow the same ordering.
