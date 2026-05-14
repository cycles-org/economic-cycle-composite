import { useState } from 'react';

interface Props {
  onSubmit: (apiKey: string) => void;
  loading: boolean;
}

export function ApiKeyInput({ onSubmit, loading }: Props) {
  const [key, setKey] = useState('');

  return (
    <div className="min-h-screen bg-pg flex items-center justify-center px-4">
      <div className="bg-card border border-line rounded-lg p-10 w-full max-w-md shadow-sm">
        {/* FSC brand mark + wordmark */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-line">
          <img
            src="/brand/logo-fsc-mark.png"
            alt="Foundation for the Study of Cycles"
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="leading-tight">
            <div className="text-ink font-display font-bold text-sm tracking-tight">
              Foundation for the Study of Cycles
            </div>
            <div className="text-ink3 text-[10px] uppercase tracking-[0.16em] mt-0.5">
              Research Dashboard
            </div>
          </div>
        </div>

        <h1 className="text-2xl text-ink mb-2 font-display font-bold leading-tight">
          Economic Cycle Composite
        </h1>
        <p className="text-ink3 text-sm mb-8 leading-relaxed">
          A five-layer macro regime score reconstructed from 31 public series —
          leading indicators, coincident activity, financial stress, monetary
          policy, and global liquidity.
        </p>

        <label className="block text-xs text-ink3 mb-2 uppercase tracking-wide font-medium">
          Cycle Tools API Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your API key"
          className="w-full bg-raised border border-line2 rounded px-3 py-2.5 text-ink placeholder-ink4 focus:outline-none focus:border-c-amber focus:ring-2 focus:ring-c-amber/20 mb-5 font-mono text-sm transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && key.trim()) onSubmit(key.trim());
          }}
        />

        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim() || loading}
          style={{ color: key.trim() && !loading ? '#1B1A18' : undefined }}
          className="w-full bg-c-amber hover:opacity-90 disabled:bg-hover disabled:text-ink4 disabled:cursor-not-allowed font-semibold rounded px-4 py-2.5 transition-all"
        >
          {loading ? 'Running pipeline…' : 'Run all 31 series'}
        </button>

        <p className="text-ink4 text-xs mt-5 leading-relaxed">
          The key is held in browser memory for this session only. It is never
          stored on disk and never transmitted anywhere other than{' '}
          <span className="font-mono">api.cycle.tools</span>.
        </p>
      </div>
    </div>
  );
}
