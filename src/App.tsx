import { useState, useCallback, useRef } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { BacktestReview } from './components/BacktestReview';
import { Dashboard } from './components/Dashboard';
import { PhaseIconTest } from './components/PhaseIconTest';
import { SERIES_REGISTRY } from './config/seriesRegistry';
import { runPipeline } from './services/pipeline';
import { runLiquidityPipeline } from './services/liquidityPipeline';
import { calculateComposite } from './services/composite';
import { calculateProjection } from './services/projection';
import { calculateRecessionIndicator } from './services/recessionIndicator';
import type { CompositeResult } from './services/composite';
import type { ProjectionResult } from './services/projection';
import type { RecessionIndicatorResult } from './services/recessionIndicator';
import type { SeriesResult, LiquidityResult } from './types';

function App() {
  // Show test pages
  if (window.location.search.includes('phasetest')) {
    return <PhaseIconTest />;
  }
  if (window.location.search.includes('backtest')) {
    return <BacktestReview />;
  }
  const [apiKey, setApiKey] = useState('');
  const [results, setResults] = useState<SeriesResult[]>([]);
  const [liquidityResult, setLiquidityResult] = useState<LiquidityResult | undefined>(undefined);
  const [composite, setComposite] = useState<CompositeResult>({
    masterScore: 0,
    divergenceAdjustment: 0,
    regime: { label: 'Neutral', color: 'text-yellow-300', bgColor: 'bg-yellow-500/10', implication: '' },
    divergence: { spread: 0, signal: 'none', description: '' },
    liquidityDivergence: { l5l1Spread: 0, signal: 'none', description: '', regimeDowngrade: false },
    layers: [],
    totalSeries: 0,
    validSeries: 0,
    errorSeries: 0,
    timestamp: '',
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [projection, setProjection] = useState<ProjectionResult | undefined>(undefined);
  const [recessionIndicator, setRecessionIndicator] = useState<RecessionIndicatorResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const resultsRef = useRef<SeriesResult[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const runAllSeries = useCallback(
    async (key?: string) => {
      const activeKey = key ?? apiKey;
      setLoading(true);
      setResults([]);
      setLiquidityResult(undefined);
      setLogs([]);
      resultsRef.current = [];
      const totalCount = SERIES_REGISTRY.length + 1; // +1 for liquidity pipeline
      setProgress({ done: 0, total: totalCount });

      addLog(`Starting full pipeline for ${SERIES_REGISTRY.length} series + liquidity layer...`);

      // Track liquidity result locally for incremental composite updates
      let latestLiquidity: LiquidityResult | undefined = undefined;

      // Run L1-L4 series and L5 liquidity pipeline in parallel
      const seriesPromises = SERIES_REGISTRY.map(async (series) => {
        const result = await runPipeline(activeKey, series, addLog);

        resultsRef.current = [...resultsRef.current, result];
        setResults([...resultsRef.current]);
        setProgress((p) => ({ ...p, done: p.done + 1 }));

        const comp = calculateComposite(resultsRef.current, latestLiquidity);
        setComposite(comp);

        return result;
      });

      const liquidityPromise = runLiquidityPipeline(activeKey, addLog).then((liq) => {
        latestLiquidity = liq;
        setLiquidityResult(liq);
        setProgress((p) => ({ ...p, done: p.done + 1 }));

        // Recalculate composite with liquidity included
        const comp = calculateComposite(resultsRef.current, liq);
        setComposite(comp);

        return liq;
      }).catch((err) => {
        addLog(`[Liquidity] PIPELINE ERROR: ${err instanceof Error ? err.message : String(err)}`);
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        return undefined;
      });

      await Promise.all([...seriesPromises, liquidityPromise]);

      try {
        const finalResults = resultsRef.current;
        const finalComposite = calculateComposite(finalResults, latestLiquidity);
        setComposite(finalComposite);
        const proj = calculateProjection(finalResults, finalComposite, latestLiquidity);
        setProjection(proj);
        try {
          setRecessionIndicator(calculateRecessionIndicator(finalComposite, proj));
        } catch (e) {
          addLog(`[RecessionIndicator] ERROR: ${e instanceof Error ? e.message : String(e)}`);
        }

        const errors = finalResults.filter((r) => r.error);
        const success = finalResults.filter((r) => !r.error);
        addLog(
          `Done. ${success.length} succeeded, ${errors.length} failed. ` +
          `Composite: ${finalComposite.masterScore.toFixed(1)} (${finalComposite.regime.label})`
        );
      } catch (e) {
        addLog(`[Finalize] ERROR: ${e instanceof Error ? e.message : String(e)}`);
      }

      setLoading(false);
    },
    [apiKey, addLog]
  );

  const handleSubmit = useCallback(
    (key: string) => {
      setApiKey(key);
      setStarted(true);
      runAllSeries(key);
    },
    [runAllSeries]
  );

  if (!started) {
    return <ApiKeyInput onSubmit={handleSubmit} loading={loading} />;
  }

  return (
    <Dashboard
      composite={composite}
      recessionIndicator={recessionIndicator}
      results={results}
      liquidityResult={liquidityResult}
      projection={projection}
      logs={logs}
      loading={loading}
      progress={progress}
      onRunAll={() => runAllSeries()}
      onBack={() => {
        setStarted(false);
        setResults([]);
        setLiquidityResult(undefined);
        setProjection(undefined);
        setRecessionIndicator(undefined);
        setLogs([]);
      }}
    />
  );
}

export default App;
