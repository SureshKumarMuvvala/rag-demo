# RAG · TCO — Total Cost of Ownership Estimator

An interactive, **frontend-only** estimator for the true monthly cost buckets of a production
Retrieval-Augmented Generation (RAG) system. It goes beyond the visible API bill (the
"waterline") to model the layers most teams forget — vector storage & retrieval, ingestion &
embedding, re-indexing, reranking, network egress, observability, and engineering labor — then
lets you export a branded proposal as **PDF** or **Excel**.

All prices are **illustrative, dated June 2026**. Nothing is a quote; verify rates against the
official pricing pages linked inside the app.

## What's inside

Five tabs, joined by an `Explore → Estimate → Propose` flow:

- **Explore** — a master–detail guide to each RAG cost layer: scannable bullets + key–value
  facts, provider comparison tables, an interactive "token lab", a clickable pipeline diagram,
  and a filterable glossary. "Use in Estimate" buttons preselect the matching option.
- **Estimate** — a tile-based configurator (Corpus, Traffic, Generation, Embedding, Vector DB,
  Reranking, Caching, Network, Team & misc) with a live cost breakdown, custom-rate overrides,
  per-bucket flat pins, and miscellaneous line items.
- **Propose** — turns the current estimate into a shareable proposal with a live preview and
  client-side **PDF** / **Excel** exports (plus "Copy summary").
- **Build vs. Buy** — managed vs. self-hosted totals from the same inputs.
- **Scale & Break-even** — cost curves across query volume with the managed/self-hosted crossover.

Everything runs in the browser — there is no backend and no data leaves the page. Exports are
generated client-side.

## Tech stack

- **React 18 + TypeScript**, built with **Vite 5**
- **Tailwind CSS** (design tokens: ink `#15242B`, petrol `#0E6E6E`, petrol-light `#2DA0A0`,
  amber `#C2790C`; Space Grotesk / Inter / IBM Plex Mono)
- **Recharts** (scale curves)
- **jsPDF + jspdf-autotable** (PDF export) and **SheetJS `xlsx`** (Excel export)
- **Vitest** for the cost-model unit tests

## Prerequisites

- **Node.js 18+** and npm

No API keys, environment variables, or database are required — the estimator is fully
client-side.

## Setup & running

```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (default **http://localhost:5173**).

### Available scripts (run from `frontend/`)

| Command           | What it does                                              |
|-------------------|-----------------------------------------------------------|
| `npm run dev`     | Start the Vite dev server with hot reload                 |
| `npm run build`   | Type-check (`tsc -b`) and build a production bundle to `dist/` |
| `npm run preview` | Serve the production build locally                        |
| `npm test`        | Run the Vitest unit tests (cost model + exporters)        |

### Production build

```bash
cd frontend
npm run build      # outputs static assets to frontend/dist/
npm run preview    # optional: preview the built site
```

The contents of `frontend/dist/` are static files and can be hosted on any static host
(Netlify, Vercel, GitHub Pages, S3, etc.).

## Continuous deployment (Netlify)

This repo is Git-connected-deploy ready. Build settings live in [`netlify.toml`](./netlify.toml)
(read on every push), so no build configuration is needed in the Netlify UI — you only connect
the repo once and point the production branch at **`master`**.

One-time setup:

1. In Netlify: **Add new site → Import an existing project** and connect this Git repository.
2. Leave the build command / publish directory as-is — Netlify reads them from `netlify.toml`
   (`base = frontend`, `command = npm run build`, `publish = dist`, `NODE_VERSION = 22`).
3. Set the **production branch to `master`**: Site configuration → Build & deploy → Branches →
   *Production branch* = `master`.

After that:

- **Every push to `master`** automatically builds and deploys to production.
- **Pull requests** get their own [Deploy Preview](https://docs.netlify.com/site-deploys/deploy-previews/)
  URLs; other branches get branch deploys.
- SPA deep links / hard refreshes are handled by the `/* → /index.html` rule (in both
  `netlify.toml` and `frontend/public/_redirects`).

No backend, serverless functions, environment variables, or secrets are required.

## Project structure

```
rag-demo/
├── frontend/                     # the RAG TCO Estimator (this is the app)
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── public/
│   │   └── favicon.svg           # cost-tower mark
│   └── src/
│       ├── App.tsx               # tab shell + shared estimate state
│       ├── components/
│       │   ├── Hero.tsx, Logo.tsx, Icon.tsx
│       │   ├── TabExplore.tsx    # Explore (guide, pipeline, token lab, glossary)
│       │   ├── TabEstimate.tsx   # tile configurator
│       │   ├── TabPropose.tsx    # proposal preview + exports
│       │   ├── TabBuildVsBuy.tsx, TabScale.tsx
│       │   └── estimate/         # tiles, stat cards, summary panel, misc editor
│       └── lib/
│           ├── types.ts          # Inputs, Overrides, CostBreakdown, misc
│           ├── rates.ts          # illustrative rate tables (June 2026)
│           ├── costs.ts          # pure cost model  (+ costs.test.ts)
│           ├── scale.ts          # scale/break-even  (+ scale.test.ts)
│           ├── exploreContent.ts # Explore copy, tables, glossary, pipeline
│           ├── proposal.ts       # shared proposal model  (+ proposal.test.ts)
│           ├── exportPdf.ts      # jsPDF proposal export
│           └── exportXlsx.ts     # SheetJS proposal export
└── Prompts/                      # design/build prompts used to create the app
```

## Testing

```bash
cd frontend
npm test
```

The suite (Vitest) covers the pure cost model (`costs.ts`), the scale/break-even math
(`scale.ts`), and the proposal model + PDF/XLSX generation (`proposal.ts`).

## How the estimate works (at a glance)

- Edit inputs on **Estimate**; the monthly total, annual (×12), and one-time setup update live.
- Any tile can be set to **＋ Custom** to hand-enter rates that feed the model; the ✎ on a
  summary row pins that bucket to a flat $/mo; **＋ Add cost** appends monthly/one-time misc lines.
- **Propose** reads the exact same state and never recomputes differently — the on-screen
  preview, the PDF, and the Excel workbook all show identical numbers.

## Notes

- Frontend-only: no server, no persistence, no network calls for the estimate or exports.
- Figures are planning estimates dated June 2026; each Explore topic links to the provider's
  official pricing page so you can verify current rates.
