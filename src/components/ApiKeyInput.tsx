import { useState } from 'react';

interface Props {
  onSubmit: (apiKey: string) => void;
  loading: boolean;
}

export function ApiKeyInput({ onSubmit, loading }: Props) {
  const [key, setKey] = useState('');

  return (
    <div className="min-h-screen bg-pg flex items-center justify-center">
      <div className="bg-card border border-line rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-ink mb-2">
          US Economic Cycle Regime
        </h1>
        <p className="text-ink3 text-sm mb-6">
          31 series · 5 layers · Macro regime scoring
        </p>

        <label className="block text-sm text-ink3 mb-2">
          Cycle Tools API Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter your API key..."
          className="w-full bg-raised border border-line2 rounded px-3 py-2 text-ink placeholder-ink4 focus:outline-none focus:border-blue-500 mb-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && key.trim()) onSubmit(key.trim());
          }}
        />

        <button
          onClick={() => key.trim() && onSubmit(key.trim())}
          disabled={!key.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-hover disabled:text-ink4 text-white font-medium rounded px-4 py-2 transition-colors"
        >
          {loading ? 'Running Pipeline...' : 'Run All 31 Series'}
        </button>

        <p className="text-ink5 text-xs mt-4">
          Runs cycle analysis on all 31 series across 5 layers.
          API key is stored in session only — never persisted.
        </p>
      </div>
    </div>
  );
}
