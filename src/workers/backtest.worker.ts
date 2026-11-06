/// <reference lib="webworker" />
/**
 * Runs user strategy code off the main thread, so a slow or runaway
 * strategy cannot freeze the page. The caller terminates this worker
 * if it does not answer within its time limit.
 */
import { compileStrategy, runStrategyBacktest } from '@/utils/strategyEngine';
import type { BacktestJob, BacktestJobResponse } from '@/utils/runBacktestJob';

self.onmessage = (event: MessageEvent<BacktestJob>) => {
  const { code, bars, options } = event.data;
  let response: BacktestJobResponse;
  try {
    const strategy = compileStrategy(code);
    response = { ok: true, result: runStrategyBacktest(bars, strategy, options) };
  } catch (error) {
    response = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
