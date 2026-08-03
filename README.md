# PTT-TBI Platform

An AI-assisted data platform combining document Q&A (RAG), oil-market analysis, algorithmic-trading backtests, and visual data modeling.

## Features

| Page | Route | What it does |
| --- | --- | --- |
| Home | `/` | Landing page and navigation hub |
| TBI RAG | `/rag` | Upload documents, chunk + embed them locally, and ask questions grounded in your files |
| Full RAG | `/fullrag` | Extended RAG workspace with document library, summaries, and chat history |
| AlgoTrade | `/algotrade` | Author a trading strategy and backtest it against WTI crude-oil data with candlestick/equity charts |
| ChatTBU | `/chat` | Conversational AI assistant with a Gemini model selector and optional RAG mode over your uploaded documents |
| Data Modeling | `/modeling` | Import datasets, profile them, and explore schema/graph visualizations |

### How the pieces work

- **Retrieval:** documents are split into overlapping chunks (`src/utils/text.ts`), embedded as hashed bag-of-words vectors, and ranked by true cosine similarity (`src/utils/embeddings.ts`). Only the top-scoring chunks are sent to the LLM, and answer sources cite the exact excerpts used.
- **Shared document library:** TBI RAG and Full RAG each persist a library to localStorage; ChatTBU's RAG mode reads both (`src/utils/documentLibrary.ts`), so "answer from my documents" uses what you actually uploaded.
- **Model selection:** every entry in the ChatTBU model dropdown is a real Gemini model id that is passed through to the API, so the label always matches the model that answered.
- **Backtesting:** when no remote backtest API is configured, a deterministic local engine (`src/utils/backtestEngine.ts`) simulates seeded price data and runs an SMA-crossover strategy — the same parameters always reproduce the same result.
- **Charts:** Plotly and the Monaco editor are lazy-loaded, and every page is code-split, so the initial bundle stays small.
- **Resilient storage:** all localStorage access goes through `src/utils/storage.ts`, which reports quota/unavailability as values instead of throwing — a full quota shows a toast rather than blanking the page.

## Getting started

```sh
git clone https://github.com/Naphat-Sua/ptt-tbi.git
cd ptt-tbi
npm install

# Configure environment (at minimum the Gemini API key for AI features)
cp .env.example .env.local

npm run dev          # http://localhost:8080
```

### Environment variables

All client-side variables are prefixed `VITE_` and are **public at runtime** — never put server-side secrets in them. See `.env.example` for the full list:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | For AI features | Google Gemini API key |
| `VITE_GEMINI_MODEL` | No | Gemini model id (default `gemini-2.0-flash`) |
| `VITE_BACKTEST_API_URL` | No | Remote backtest service; local engine when unset |
| `VITE_DATA_API_URL` | No | Data-modeling backend (default `http://localhost:5000/api`) |
| `VITE_EMAILJS_*` | No | EmailJS credentials for the contact form |

## Scripts

```sh
npm run dev        # start the dev server
npm run build      # production build
npm run preview    # preview the production build
npm run lint       # ESLint
npm run typecheck  # TypeScript (no emit)
npm test           # vitest unit tests
npm run scheduler  # Node daemon that refreshes public oil data daily
```

### Oil data scheduler

`oildata-scheduler.js` fetches WTI prices from Yahoo Finance and rewrites
`public/Oildata.txt` and `public/Oildata.csv` daily at 08:00 GMT+7. It retries
with exponential backoff, writes atomically (temp file + rename, so a crash
can't leave a truncated data file), refuses to overwrite good data with an
empty response, and re-arms its timer even after a failed run.

## Backend (optional)

The Data Modeling Studio page talks to a small Flask API (`backend/app.py`, port 5000) for dataset import/profiling. A newer FastAPI platform API lives under `backend/app/` (auth, projects, alembic migrations).

```sh
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python app.py                 # Flask data API on :5000
# or
uvicorn app.main:app --reload # FastAPI platform API
```

## Testing

87 unit tests cover the retrieval pipeline (tokenization, embeddings, cosine
ranking), the backtest engine (determinism, trade/equity accounting,
performance metrics), CSV parsing, text chunking, localStorage failure modes
(quota, corruption, unavailable), the shared document library, and the
scheduler's parsing/formatting/scheduling logic:

```sh
npm test
```

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) on Radix primitives, Tailwind CSS
- TanStack Query, React Router
- Plotly (lazy-loaded) for financial charts, Monaco for the strategy editor
- Vitest for unit tests; GitHub Actions CI (lint, typecheck, test, build)

## License

MIT — see [LICENSE](LICENSE).
