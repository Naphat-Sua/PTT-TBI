import type { BacktestResult, PriceBar } from '@/types';
import {
  compileStrategy,
  runStrategyBacktest,
  type EngineOptions,
} from '@/utils/strategyEngine';

export interface BacktestJob {
  code: string;
  bars: PriceBar[];
  options: EngineOptions;
}

export type BacktestJobResponse =
  | { ok: true; result: BacktestResult }
  | { ok: false; error: string };

/** Default limit before a strategy is considered stuck. */
export const BACKTEST_TIMEOUT_MS = 10_000;

/**
 * Run a strategy in a Web Worker with a hard time limit.
 * Falls back to the main thread where workers are unavailable.
 */
export function runBacktestJob(
  job: BacktestJob,
  timeoutMs = BACKTEST_TIMEOUT_MS
): Promise<BacktestResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve().then(() =>
      runStrategyBacktest(job.bars, compileStrategy(job.code), job.options)
    );
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/backtest.worker.ts', import.meta.url), {
      type: 'module',
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(
        new Error(
          `Strategy did not finish within ${timeoutMs / 1000}s. Check for infinite loops.`
        )
      );
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<BacktestJobResponse>) => {
      clearTimeout(timer);
      worker.terminate();
      const response = event.data;
      if ('result' in response) resolve(response.result);
      else reject(new Error(response.error));
    };

    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(event.message || 'The backtest worker crashed.'));
    };

    worker.postMessage(job);
  });
}
