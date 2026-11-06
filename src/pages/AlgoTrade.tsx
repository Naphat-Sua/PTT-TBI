import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import {
  ChartBar,
  Code,
  Play,
  LineChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  History,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  Download,
  BookOpen,
  Upload,
  Database,
  Terminal,
  Scale,
  Activity,
  Receipt,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import MessageLoader from '@/components/ui/message-loader';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/ThemeProvider';

import type { BacktestResult, PriceBar } from '@/types';
import type { PlotParams } from 'react-plotly.js';
import { generateSyntheticPriceSeries } from '@/utils/backtestEngine';
import { filterByDate, parsePriceCsv, toCsv } from '@/utils/priceData';
import { runBacktestJob } from '@/utils/runBacktestJob';
import { DEFAULT_TEMPLATE, STRATEGY_TEMPLATES } from '@/utils/strategyTemplates';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));
const PlotComponent = lazy(() => import('@/components/charts/Plot'));

const GOLD = '#DFBD69';
const UP = '#26A69A';
const DOWN = '#EF5350';

const Plot = (props: PlotParams) => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <MessageLoader size="lg" color="primary" />
      </div>
    }
  >
    <PlotComponent {...props} />
  </Suspense>
);

type DataSource = 'simulated' | 'sample' | 'upload';

interface LoadedData {
  bars: PriceBar[];
  label: string;
  warnings: string[];
}

const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  simulated: 'Simulated WTI-like series (seeded)',
  sample: 'Bundled WTI sample (real, last 20 sessions)',
  upload: 'Upload your own CSV',
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatCurrency = (value: number) => currency.format(value);
const formatPct = (value: number, signed = true) =>
  `${signed && value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WTIStrategyBacktester = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data
  const [source, setSource] = useState<DataSource>('simulated');
  const [startDate, setStartDate] = useState('2021-01-01');
  const [endDate, setEndDate] = useState('2025-01-01');
  const [seed, setSeed] = useState(42);
  const [externalData, setExternalData] = useState<LoadedData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Execution
  const [initialCapital, setInitialCapital] = useState(100_000);
  const [commissionPct, setCommissionPct] = useState(0.1);
  const [slippagePct, setSlippagePct] = useState(0.05);

  // Strategy
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [strategyCode, setStrategyCode] = useState(DEFAULT_TEMPLATE.code);

  // Results
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const applyLoadedData = useCallback((data: LoadedData) => {
    setExternalData(data);
    if (data.bars.length > 0) {
      setStartDate(data.bars[0].date);
      setEndDate(data.bars[data.bars.length - 1].date);
    }
  }, []);

  // Load the bundled sample when that source is picked
  useEffect(() => {
    if (source !== 'sample') return;
    let cancelled = false;
    setIsDataLoading(true);
    fetch('/Oildata-current.txt')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parsePriceCsv(text);
        applyLoadedData({
          bars: parsed.bars,
          label: 'WTI crude oil futures sample',
          warnings: [
            ...parsed.warnings,
            'This sample is short. Most indicators need 30+ bars, so upload a longer CSV for real tests.',
          ],
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setExternalData(null);
        setError(`Could not load the bundled sample: ${err.message}`);
      })
      .finally(() => !cancelled && setIsDataLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, applyLoadedData]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const parsed = parsePriceCsv(await file.text());
        applyLoadedData({ bars: parsed.bars, label: file.name, warnings: parsed.warnings });
        toast({
          title: 'Price data loaded',
          description: `${parsed.bars.length} bars from ${file.name}`,
        });
      } catch (err) {
        setExternalData(null);
        setError(`Could not read ${file.name}: ${err instanceof Error ? err.message : err}`);
      }
    },
    [applyLoadedData, toast]
  );

  const changeSource = (next: DataSource) => {
    setSource(next);
    setExternalData(null);
    setError(null);
    if (next === 'upload') fileInputRef.current?.click();
  };

  /** Bars the backtest will actually run on. */
  const bars = useMemo<PriceBar[]>(() => {
    if (source === 'simulated') {
      return generateSyntheticPriceSeries({
        startDate,
        endDate,
        startPrice: 75,
        dailyVolatility: 0.022,
        seed,
      });
    }
    return externalData ? filterByDate(externalData.bars, startDate, endDate) : [];
  }, [source, startDate, endDate, seed, externalData]);

  const handleTemplateChange = (id: string) => {
    const template = STRATEGY_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setTemplateId(id);
    setStrategyCode(template.code);
  };

  const handleRun = useCallback(async () => {
    if (bars.length < 2) {
      setError('No price data in the selected range. Pick a data source or widen the dates.');
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const res = await runBacktestJob({
        code: strategyCode,
        bars,
        options: {
          initialCapital,
          commission: commissionPct / 100,
          slippage: slippagePct / 100,
        },
      });
      if (res.status === 'error') throw new Error(res.message);
      setResult(res);
      toast({
        title: 'Backtest completed',
        description: `${res.performance.totalTrades} closed trades, total return ${formatPct(
          res.performance.totalReturn
        )}`,
      });
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [bars, strategyCode, initialCapital, commissionPct, slippagePct, toast]);

  const exportTrades = () => {
    if (!result) return;
    downloadFile(
      'backtest-trades.csv',
      toCsv([
        ['date', 'type', 'price', 'size', 'value', 'fee', 'pnl'],
        ...result.trades.map((t) => [
          t.date,
          t.type,
          t.price.toFixed(4),
          t.size,
          t.value.toFixed(2),
          (t.fee ?? 0).toFixed(2),
          t.pnl !== undefined ? t.pnl.toFixed(2) : '',
        ]),
      ])
    );
  };

  const exportEquity = () => {
    if (!result) return;
    downloadFile(
      'backtest-equity.csv',
      toCsv([
        ['date', 'equity', 'cash', 'holdings', 'buy_and_hold'],
        ...result.equity.map((p, i) => [
          p.date,
          p.value.toFixed(2),
          p.cash.toFixed(2),
          p.holdings.toFixed(2),
          result.benchmark?.[i]?.value.toFixed(2) ?? '',
        ]),
      ])
    );
  };

  // ---- Charts --------------------------------------------------------------

  const chartLayout = useMemo((): Partial<Plotly.Layout> => {
    const fg = theme === 'dark' ? '#d1d5db' : '#374151';
    const grid = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    return {
      autosize: true,
      margin: { l: 60, r: 20, t: 10, b: 40 },
      font: { color: fg },
      xaxis: { gridcolor: grid, rangeslider: { visible: false } },
      yaxis: { gridcolor: grid, tickprefix: '$' },
      legend: { orientation: 'h', y: 1.12 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
    };
  }, [theme]);

  const equityTraces = useMemo((): Plotly.Data[] => {
    if (!result) return [];
    const traces: Plotly.Data[] = [
      {
        x: result.equity.map((p) => p.date),
        y: result.equity.map((p) => p.value),
        type: 'scatter',
        mode: 'lines',
        name: 'Strategy',
        line: { color: GOLD, width: 2 },
      },
    ];
    if (result.benchmark) {
      traces.push({
        x: result.benchmark.map((p) => p.date),
        y: result.benchmark.map((p) => p.value),
        type: 'scatter',
        mode: 'lines',
        name: 'Buy & hold',
        line: { color: '#9CA3AF', width: 1.5, dash: 'dot' },
      });
    }
    return traces;
  }, [result]);

  const priceTraces = useMemo((): Plotly.Data[] => {
    if (!result) return [];
    const p = result.priceData;
    const marker = (type: 'buy' | 'sell'): Plotly.Data => {
      const trades = result.trades.filter((t) => t.type === type);
      return {
        x: trades.map((t) => t.date),
        y: trades.map((t) => t.price),
        type: 'scatter',
        mode: 'markers',
        name: type === 'buy' ? 'Buy' : 'Sell',
        marker: {
          color: type === 'buy' ? UP : DOWN,
          size: 11,
          symbol: type === 'buy' ? 'triangle-up' : 'triangle-down',
          line: { color: '#fff', width: 1 },
        },
        text: trades.map(
          (t) =>
            `${type.toUpperCase()} ${t.size} @ ${formatCurrency(t.price)}` +
            (t.pnl !== undefined ? `<br>P&L ${formatCurrency(t.pnl)}` : '')
        ),
        hoverinfo: 'text',
      };
    };
    return [
      {
        x: p.map((b) => b.date),
        open: p.map((b) => b.open),
        high: p.map((b) => b.high),
        low: p.map((b) => b.low),
        close: p.map((b) => b.close),
        type: 'candlestick',
        name: 'Price',
        increasing: { line: { color: UP } },
        decreasing: { line: { color: DOWN } },
      },
      marker('buy'),
      marker('sell'),
    ];
  }, [result]);

  // ---- Render --------------------------------------------------------------

  const perf = result?.performance;
  const finalEquity = result?.equity[result.equity.length - 1]?.value ?? 0;
  const openPosition = result?.equity[result.equity.length - 1]?.holdings ?? 0;
  const excessReturn = perf ? perf.totalReturn - (perf.buyHoldReturn ?? 0) : 0;
  const activeTemplate = STRATEGY_TEMPLATES.find((t) => t.id === templateId);

  return (
    <div className="space-y-8">
      <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-800/80">
          <CardTitle className="text-2xl font-bold flex items-center text-gray-800 dark:text-gray-200">
            <ChartBar className="h-6 w-6 mr-3" style={{ color: GOLD }} />
            Strategy Backtester
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Write a JavaScript strategy, pick a price series, and get realistic results with
            next-bar fills, commission, and slippage.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-7 pt-5">
          {/* Data source */}
          <section className="space-y-4">
            <SectionTitle icon={<Database className="h-5 w-5" style={{ color: GOLD }} />}>
              Price data
            </SectionTitle>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={(v) => changeSource(v as DataSource)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DATA_SOURCE_LABELS) as DataSource[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {DATA_SOURCE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {source === 'simulated' ? (
                <div className="space-y-2">
                  <Label htmlFor="seed">Random seed</Label>
                  <Input
                    id="seed"
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 0)}
                    className="rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>CSV file</Label>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {source === 'upload' && externalData ? 'Replace file' : 'Upload CSV'}
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSource('upload');
                    handleFileUpload(file);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <NumberField label="Start date" id="start">
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </NumberField>
              <NumberField label="End date" id="end">
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </NumberField>
              <NumberField label="Initial capital ($)" id="capital">
                <Input
                  id="capital"
                  type="number"
                  min={1}
                  step={1000}
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="rounded-xl"
                />
              </NumberField>
              <NumberField label="Commission (%)" id="commission">
                <Input
                  id="commission"
                  type="number"
                  min={0}
                  step={0.01}
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                />
              </NumberField>
              <NumberField label="Slippage (%)" id="slippage">
                <Input
                  id="slippage"
                  type="number"
                  min={0}
                  step={0.01}
                  value={slippagePct}
                  onChange={(e) => setSlippagePct(Math.max(0, Number(e.target.value)))}
                  className="rounded-xl"
                />
              </NumberField>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {isDataLoading ? (
                <MessageLoader size="sm" color="primary" />
              ) : (
                <>
                  <Badge variant="secondary" className="rounded-full">
                    {bars.length.toLocaleString()} bars
                  </Badge>
                  {bars.length > 0 && (
                    <span>
                      {formatDate(bars[0].date)} to {formatDate(bars[bars.length - 1].date)}
                    </span>
                  )}
                  <span className="text-gray-400">·</span>
                  <span>
                    {source === 'simulated'
                      ? 'Synthetic data, not real market prices'
                      : externalData?.label ?? 'No file loaded'}
                  </span>
                </>
              )}
            </div>
            {source !== 'simulated' &&
              externalData?.warnings.map((w) => (
                <p key={w} className="text-xs text-amber-600 dark:text-amber-400">
                  {w}
                </p>
              ))}
          </section>

          {/* Strategy editor */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle icon={<Code className="h-5 w-5" style={{ color: GOLD }} />}>
                Strategy
              </SectionTitle>
              <div className="flex items-center gap-2">
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-[220px] rounded-full">
                    <SelectValue placeholder="Load a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGY_TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleTemplateChange(templateId)}
                  disabled={isRunning}
                >
                  Reset
                </Button>
              </div>
            </div>
            {activeTemplate && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{activeTemplate.description}</p>
            )}

            <div className="h-[420px] border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800">
                    <MessageLoader size="lg" color="primary" />
                  </div>
                }
              >
                <MonacoEditor
                  height="420px"
                  language="javascript"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  value={strategyCode}
                  onChange={(value) => setStrategyCode(value ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    readOnly: isRunning,
                    tabSize: 2,
                  }}
                />
              </Suspense>
            </div>

            <div className="text-sm flex items-start text-gray-600 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-900/40 p-4 rounded-2xl">
              <Info className="h-4 w-4 mr-2 mt-0.5 shrink-0" style={{ color: GOLD }} />
              <div>
                Define <InlineCode>onBar(ctx)</InlineCode>. It runs once per bar in a sandboxed
                worker. Use <InlineCode>ctx.sma()</InlineCode>, <InlineCode>ctx.ema()</InlineCode>,{' '}
                <InlineCode>ctx.rsi()</InlineCode>, <InlineCode>ctx.bollinger()</InlineCode>,{' '}
                <InlineCode>ctx.macd()</InlineCode>, <InlineCode>ctx.atr()</InlineCode>, then{' '}
                <InlineCode>ctx.buy()</InlineCode> / <InlineCode>ctx.sell()</InlineCode>. Load
                "Blank strategy" for the full API.
              </div>
            </div>
          </section>

          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Backtest failed</AlertTitle>
              <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleRun}
            disabled={isRunning || isDataLoading || bars.length < 2}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] hover:opacity-90 transition-opacity shadow-md"
          >
            {isRunning ? (
              <>
                <MessageLoader size="sm" color="secondary" className="mr-2" />
                Running backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && perf && (
        <Card className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-2xl font-bold flex items-center text-gray-800 dark:text-gray-200">
                <LineChart className="h-6 w-6 mr-3" style={{ color: GOLD }} />
                Results
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTrades}
                  disabled={result.trades.length === 0}
                  className="rounded-full border-[#DFBD69] text-[#DFBD69] hover:bg-[#DFBD69]/10"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Trades CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportEquity}
                  className="rounded-full border-[#DFBD69] text-[#DFBD69] hover:bg-[#DFBD69]/10"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Equity CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="rounded-full">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              {result.priceData.length.toLocaleString()} bars,{' '}
              {formatDate(result.priceData[0].date)} to{' '}
              {formatDate(result.priceData[result.priceData.length - 1].date)}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 pt-5">
            <section className="space-y-5">
              <SectionTitle icon={<BarChart3 className="h-5 w-5" style={{ color: GOLD }} />}>
                Performance
              </SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Total return"
                  value={formatPct(perf.totalReturn)}
                  tone={perf.totalReturn >= 0 ? 'up' : 'down'}
                />
                <Metric
                  icon={<Scale className="h-4 w-4" />}
                  label="vs buy & hold"
                  value={formatPct(excessReturn)}
                  hint={`Buy & hold: ${formatPct(perf.buyHoldReturn ?? 0)}`}
                  tone={excessReturn >= 0 ? 'up' : 'down'}
                />
                <Metric
                  icon={<Percent className="h-4 w-4" />}
                  label="Annualized return"
                  value={formatPct(perf.annualizedReturn)}
                  tone={perf.annualizedReturn >= 0 ? 'up' : 'down'}
                />
                <Metric
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Max drawdown"
                  value={`-${perf.maxDrawdown.toFixed(2)}%`}
                  tone={perf.maxDrawdown > 0 ? 'down' : undefined}
                />
                <Metric
                  icon={<Activity className="h-4 w-4" />}
                  label="Sharpe ratio"
                  value={perf.sharpeRatio.toFixed(2)}
                />
                <Metric
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Win rate"
                  value={`${perf.winRate.toFixed(1)}%`}
                  hint={`${perf.totalTrades} closed trades`}
                />
                <Metric
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Profit factor"
                  value={
                    perf.profitFactor === undefined
                      ? 'n/a'
                      : Number.isFinite(perf.profitFactor)
                        ? perf.profitFactor.toFixed(2)
                        : '∞'
                  }
                  hint={`Avg win ${formatCurrency(perf.averageWin ?? 0)} · avg loss ${formatCurrency(
                    perf.averageLoss ?? 0
                  )}`}
                />
                <Metric
                  icon={<Receipt className="h-4 w-4" />}
                  label="Final equity"
                  value={formatCurrency(finalEquity)}
                  hint={`Fees ${formatCurrency(perf.totalFees ?? 0)} · in market ${(
                    perf.exposure ?? 0
                  ).toFixed(0)}%${openPosition > 0 ? ' · position open' : ''}`}
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle icon={<LineChart className="h-5 w-5" style={{ color: GOLD }} />}>
                Equity curve
              </SectionTitle>
              <div className="h-[380px] w-full border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <Plot
                  data={equityTraces}
                  layout={{ ...chartLayout, hovermode: 'x unified' }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                  config={{ responsive: true, displaylogo: false }}
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle icon={<TrendingUp className="h-5 w-5" style={{ color: GOLD }} />}>
                Price and fills
              </SectionTitle>
              <div className="h-[420px] w-full border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <Plot
                  data={priceTraces}
                  layout={{ ...chartLayout, hovermode: 'closest' }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                  config={{ responsive: true, displaylogo: false }}
                />
              </div>
            </section>

            <Accordion type="multiple" className="w-full space-y-3">
              <AccordionItem value="trades" className="border-b-0">
                <AccordionTrigger className="text-lg font-medium text-gray-800 dark:text-gray-200 py-3 px-4 bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl hover:no-underline">
                  <span className="flex items-center">
                    <History className="h-5 w-5 mr-2" style={{ color: GOLD }} />
                    Trade log ({result.trades.length} fills)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-1">
                  {result.trades.length === 0 ? (
                    <p className="text-sm text-gray-500 px-3">
                      The strategy never traded. Try a longer date range or looser conditions.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-[420px] rounded-2xl border border-gray-200 dark:border-gray-800">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/60 sticky top-0">
                          <tr>
                            {['Date', 'Side', 'Price', 'Units', 'Value', 'Fee', 'P&L'].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {result.trades.map((t, i) => (
                            <tr key={`${t.date}-${i}`}>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                {formatDate(t.date)}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    t.type === 'buy'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {t.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(t.price)}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{t.size.toLocaleString()}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(t.value)}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{formatCurrency(t.fee ?? 0)}</td>
                              <td
                                className={`px-4 py-2 font-medium ${
                                  t.pnl === undefined
                                    ? 'text-gray-400'
                                    : t.pnl >= 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {t.pnl === undefined ? '' : formatCurrency(t.pnl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="logs" className="border-b-0">
                <AccordionTrigger className="text-lg font-medium text-gray-800 dark:text-gray-200 py-3 px-4 bg-gray-50/80 dark:bg-gray-900/40 rounded-2xl hover:no-underline">
                  <span className="flex items-center">
                    <Terminal className="h-5 w-5 mr-2" style={{ color: GOLD }} />
                    Strategy log ({result.logs?.length ?? 0})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-1">
                  <pre className="max-h-[320px] overflow-auto rounded-2xl bg-gray-950 text-gray-100 text-xs p-4 font-mono">
                    {result.logs && result.logs.length > 0
                      ? result.logs.join('\n')
                      : 'Nothing logged. Call ctx.log(...) in your strategy to see output here.'}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SectionTitle = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
    {icon}
    {children}
  </h3>
);

const NumberField = ({ label, id, children }: { label: string; id: string; children: ReactNode }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

const InlineCode = ({ children }: { children: ReactNode }) => (
  <code className="bg-gray-100 dark:bg-gray-800/60 px-1.5 py-0.5 rounded-lg text-[0.85em]">{children}</code>
);

const Metric = ({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down';
}) => (
  <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
      <span style={{ color: GOLD }}>{icon}</span>
      {label}
    </div>
    <div
      className={`text-xl font-semibold ${
        tone === 'up'
          ? 'text-green-600 dark:text-green-400'
          : tone === 'down'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-800 dark:text-gray-200'
      }`}
    >
      {value}
    </div>
    {hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</div>}
  </div>
);

const AlgoTradeManual = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm rounded-3xl">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 text-left"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center">
          <BookOpen className="h-5 w-5 mr-2" style={{ color: GOLD }} />
          <span className="text-lg font-medium text-gray-800 dark:text-gray-200">How the backtester works</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="p-6">
          <div className="prose dark:prose-invert max-w-none">
            <h4>1. Choose price data</h4>
            <p>
              Use the seeded simulator to explore ideas, the bundled WTI sample, or upload a CSV
              exported from Yahoo Finance, Investing.com, or TradingView. The loader needs a{' '}
              <code>Date</code> column and a <code>Close</code> (or <code>Price</code>) column;
              Open/High/Low/Volume are optional.
            </p>

            <h4>2. Write onBar(ctx)</h4>
            <p>
              Your function runs once per bar, oldest first, inside a Web Worker with a 10 second
              limit. Indicators only see the past, and orders fill at the <strong>next</strong>{' '}
              bar's open, so there is no look-ahead bias.
            </p>
            <ul>
              <li>
                <code>ctx.bar</code>, <code>ctx.position</code>, <code>ctx.cash</code>,{' '}
                <code>ctx.equity</code>, <code>ctx.entryPrice</code>, <code>ctx.state</code>
              </li>
              <li>
                <code>ctx.sma(n)</code>, <code>ctx.ema(n)</code>, <code>ctx.rsi(n)</code>,{' '}
                <code>ctx.atr(n)</code>, <code>ctx.bollinger(n, k)</code>,{' '}
                <code>ctx.macd(fast, slow, signal)</code>; pass <code>barsAgo</code> as the last
                argument to read older values
              </li>
              <li>
                <code>ctx.buy(fraction)</code> spends a share of cash,{' '}
                <code>ctx.sell(fraction)</code> exits part or all of the position
              </li>
              <li>
                <code>ctx.log(...)</code> writes to the strategy log
              </li>
            </ul>

            <h4>3. Read the results</h4>
            <ul>
              <li>
                <strong>vs buy &amp; hold</strong> tells you whether the strategy beat simply
                holding the asset. Most don't.
              </li>
              <li>
                <strong>Win rate and profit factor</strong> are computed from realized P&amp;L net
                of fees.
              </li>
              <li>Export trades and the equity curve as CSV for further analysis.</li>
            </ul>

            <p className="text-sm text-gray-500">
              Results are for research and education only and are not investment advice.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const AlgoTrade = () => (
  <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#DFBD69] to-[#B89D4F] bg-clip-text text-transparent">
        Algorithmic Trading Lab
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
        Prototype trading strategies for WTI crude oil (or any CSV price series) and see how they
        would have performed after costs.
      </p>
    </div>
    <div className="mb-8">
      <WTIStrategyBacktester />
    </div>
    <AlgoTradeManual />
  </div>
);

export default AlgoTrade;
