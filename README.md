# PTT-TBI Platform

An AI-assisted data platform combining document Q&A (RAG), oil-market analysis, algorithmic-trading backtests, and visual data modeling.

## Features

| Page | Route | What it does |
| --- | --- | --- |
| Home | `/` | Landing page and navigation hub |
| TBI RAG | `/rag` | Upload documents, chunk + embed them locally, and ask questions grounded in your files |
| Full RAG | `/fullrag` | Extended RAG workspace with document library, summaries, and chat history |
| AlgoTrade | `/algotrade` | Write JavaScript trading strategies and backtest them on simulated, bundled WTI, or uploaded CSV prices, with costs, a buy-and-hold benchmark, and CSV export |
| ChatTBU | `/chat` | Conversational AI assistant (Gemini) with optional RAG mode |
| Data Modeling | `/modeling` | Import datasets, profile them, and explore schema/graph visualizations |

### How the pieces work

- **Retrieval:** documents are split into overlapping chunks (`src/utils/text.ts`), embedded as hashed bag-of-words vectors, and ranked by true cosine similarity (`src/utils/embeddings.ts`). Only the top-scoring chunks are sent to the LLM, and answer sources cite the exact excerpts used.
- **Backtesting:** strategies are plain JavaScript `onBar(ctx)` functions run by an event-driven engine (`src/utils/strategyEngine.ts`) inside a Web Worker with a 10 s time limit. Orders fill at the next bar's open with configurable commission and slippage, so there is no look-ahead bias. Built-in indicators (`src/utils/indicators.ts`): SMA, EMA, RSI, Bollinger Bands, MACD, ATR. Templates include SMA crossover, RSI mean reversion, Bollinger bounce, and MACD + ATR trailing stop.
- **Price data:** a seeded simulator for quick experiments, the bundled WTI sample, or any CSV from Yahoo Finance, Investing.com, or TradingView (`src/utils/priceData.ts` detects columns, date formats, and values like `18.09K`).
- **Charts:** Plotly (finance-only bundle, about a quarter of full plotly.js) and the Monaco editor are lazy-loaded, and every page is code-split, so the initial bundle stays small.

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

Unit tests cover the retrieval pipeline (tokenization, embeddings, cosine ranking), the strategy engine (next-bar fills, fees and slippage, partial exits, no look-ahead, every template), technical indicators, price CSV loading, performance metrics, and text chunking:

```sh
npm test
```

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [shadcn/ui](https://ui.shadcn.com/) on Radix primitives, Tailwind CSS
- TanStack Query, React Router
- Plotly finance bundle (lazy-loaded) for charts, Monaco for the strategy editor, Web Workers for sandboxed backtests
- Vitest for unit tests; GitHub Actions CI (lint, typecheck, test, build)

## License

MIT — see [LICENSE](LICENSE).
