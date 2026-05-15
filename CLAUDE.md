# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Express + Vite) on http://localhost:3000
npm run build     # Vite production build → dist/
npm run preview   # Preview production build
npm run lint      # TypeScript type-check only (tsc --noEmit), no test runner configured
npm run clean     # Remove dist/
```

Requires Node ≥ 20. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` before running.

## Architecture

This is a **full-stack single-repo** app with no separate frontend/backend directories. All source lives at the repo root.

### Server (`server.ts`)

Express app that handles three POST API routes and doubles as the Vite dev-server host:

| Route | Purpose |
|---|---|
| `POST /api/preview` | Parses uploaded XLSX/CSV, returns first 9 rows as JSON for display |
| `POST /api/audit` | Full rule-based GST compliance scan; returns `flaggedIssues[]` + `summary` |
| `POST /api/review` | Sends flagged issues to Gemini AI and streams back a markdown compliance report |
| `GET /api/health` | Liveness check |

In **local dev**, `server.ts` calls `startServer()` which embeds Vite as Express middleware — one process serves both the API and the React SPA with HMR. In **production (Vercel)**, `api/index.ts` re-exports the Express app as a serverless function, and `vercel.json` routes all `/api/*` requests there and everything else to `index.html`.

### Audit Logic (inside `server.ts`)

The audit pipeline is purely rule-based, not AI-generated:
1. **Header mapping** — if column names don't exactly match the seven expected fields (`Date`, `Invoice Number`, `GSTIN`, `Amount`, `GST Rate`, `GST Amount`, `Vendor`), a Gemini prompt is used to produce a field→header mapping JSON before processing.
2. **Rule checks** (per row): Missing GSTIN, invalid GST rate (must be 5/12/18/28), calculation mismatch (`Amount × Rate / 100` tolerance ±1), duplicate invoice numbers.
3. **AI narrative** — `POST /api/review` takes the flagged issues and generates a markdown strategic summary via `generateWithFallback()`.

`generateWithFallback()` tries models in order — `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash-preview-04-17` — skipping on 404 or 429.

### Frontend (`src/App.tsx`)

Single-component React 19 SPA. All UI state lives in `App` via `useState`. Key flows:
- **Upload** → file stored in state; `fetchPreviewForFile()` calls `/api/preview` and opens a modal.
- **Run Audit** → `runAudit()` POSTs to `/api/audit`, then immediately calls `generateAIReview()` against `/api/review` in parallel.
- **Export** → `exportToCSV()` builds a blob client-side from `results.flaggedIssues`.
- Sortable issues table uses `useMemo` with a `sortConfig` state.
- A built-in `DEMO_CSV` constant (55 rows with intentional violations) lets you test without uploading a file.

Styling: Tailwind CSS v4 (via `@tailwindcss/vite`). Animations: Framer Motion (`motion/react`). Markdown rendering: `react-markdown`.

### Deployment

`vercel.json` wires Vercel serverless: API routes → `api/index.ts` (re-exports Express app), SPA routes → `index.html`. Set `GEMINI_API_KEY` in Vercel environment variables.

## Key Data Types

Shared between `server.ts` and `src/App.tsx` (duplicated, not imported):

```ts
interface Transaction { Date, 'Invoice Number', GSTIN, Amount, 'GST Rate', 'GST Amount', Vendor }
interface FlaggedIssue { rowIndex, invoiceNumber, issue, details, data: Transaction }
interface Summary { totalRecords, flaggedCount, uniqueIssues }
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Generative AI SDK authentication |
| `PORT` | No (default 3000) | Express listen port |
