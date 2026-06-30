import { useState } from 'react';
import Header from './components/Header';
import TabEstimate from './components/TabEstimate';
import TabBuildVsBuy from './components/TabBuildVsBuy';
import TabScale from './components/TabScale';
import { DEFAULT_INPUTS } from './lib/types';
import type { Inputs } from './lib/types';

interface TabDef {
  index: number;
  key: string;
  label: string;
}

const TABS: TabDef[] = [
  { index: 0, key: 'estimate', label: 'Estimate' },
  { index: 1, key: 'buildvsbuy', label: 'Build vs. Buy' },
  { index: 2, key: 'scale', label: 'Scale & Break-even' },
];

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const handleInputChange = (patch: Partial<Inputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  const handleQueryChange = (q: number) =>
    setInputs((prev) => ({ ...prev, requestsPerMonth: q }));

  return (
    <div className="min-h-full rag-scroll">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 md:py-10">
        <Header />

        {/* Segmented tab control */}
        <div
          role="tablist"
          aria-label="Estimator tabs"
          className="mt-8 inline-flex rounded-2xl border border-borders bg-surfaces p-1 shadow-card"
        >
          {TABS.map((tab) => {
            const active = tab.index === activeIndex;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`tab-panel-${tab.key}`}
                id={`tab-${tab.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveIndex(tab.index)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.index, setActiveIndex)}
                className={[
                  'flex items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
                  active
                    ? 'bg-petrol text-white shadow-sm'
                    : 'text-ink hover:bg-tinted-surface',
                ].join(' ')}
              >
                <span
                  className={[
                    'font-mono text-[11px] uppercase tracking-wider',
                    active ? 'text-white/80' : 'text-petrol',
                  ].join(' ')}
                >
                  {String(tab.index + 1).padStart(2, '0')}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active tab panel */}
        <div className="mt-6">
          {activeIndex === 0 && (
            <TabEstimate inputs={inputs} onChange={handleInputChange} />
          )}
          {activeIndex === 1 && <TabBuildVsBuy inputs={inputs} />}
          {activeIndex === 2 && (
            <TabScale inputs={inputs} onQueryChange={handleQueryChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function handleTabKeyDown(
  e: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  set: (i: number) => void,
) {
  const order = TABS.map((t) => t.index);
  const idx = order.indexOf(index);
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    set(order[(idx + 1) % order.length]);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    set(order[(idx - 1 + order.length) % order.length]);
  } else if (e.key === 'Home') {
    e.preventDefault();
    set(order[0]);
  } else if (e.key === 'End') {
    e.preventDefault();
    set(order[order.length - 1]);
  }
}
