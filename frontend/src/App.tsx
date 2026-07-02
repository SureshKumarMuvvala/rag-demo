import { Fragment, useRef, useState } from 'react';
import Hero from './components/Hero';
import Icon from './components/Icon';
import TabEstimate from './components/TabEstimate';
import TabPropose from './components/TabPropose';
import TabBuildVsBuy from './components/TabBuildVsBuy';
import TabScale from './components/TabScale';
import { DEFAULT_INPUTS } from './lib/types';
import type { Inputs, MiscItem, Overrides } from './lib/types';
import { defaultProposalMeta, PRICES_AS_OF } from './lib/proposal';
import type { ProposalMeta } from './lib/proposal';
import { CurrencyProvider, useCurrency } from './lib/currency';

interface TabDef {
  index: number;
  key: string;
  label: string;
}

const TABS: TabDef[] = [
  { index: 0, key: 'estimate', label: 'Estimate' },
  { index: 1, key: 'propose', label: 'Propose' },
  { index: 2, key: 'buildvsbuy', label: 'Build vs. Buy' },
  { index: 3, key: 'scale', label: 'Scale & Break-even' },
];

// A petrol flow arrow precedes Propose (the Estimate → Propose workflow arc).
const FLOW_ARROW_BEFORE = new Set([1]);

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  return (
    <CurrencyProvider>
      <AppInner />
    </CurrencyProvider>
  );
}

function AppInner() {
  const { currency } = useCurrency();
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [misc, setMisc] = useState<MiscItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [proposalMeta, setProposalMeta] = useState<ProposalMeta>(() =>
    defaultProposalMeta(todayISO()),
  );

  const miscCounter = useRef(0);
  const nextMiscId = () => `misc-${miscCounter.current++}`;

  const handleInputChange = (patch: Partial<Inputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  const handleQueryChange = (q: number) =>
    setInputs((prev) => ({ ...prev, requestsPerMonth: q }));

  const handleMetaChange = (patch: Partial<ProposalMeta>) =>
    setProposalMeta((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-full rag-scroll">
      <div className="mx-auto w-full max-w-7xl px-5 py-4 md:py-5">
        <Hero />

        {/* Tab bar — real navigation, directly below the hero. Centered on
            desktop with the relocated "prices as of" stamp at the far right;
            stacks (stamp below) on small screens. */}
        <div className="mt-4 grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr]">
          <div aria-hidden="true" className="hidden sm:block" />
          <div className="mx-auto w-fit max-w-full overflow-x-auto rag-scroll pb-1">
            <div
              role="tablist"
              aria-label="Estimator tabs"
              className="inline-flex flex-nowrap items-center gap-0.5 rounded-2xl border border-borders bg-surfaces p-1 shadow-card"
            >
            {TABS.map((tab) => {
              const active = tab.index === activeIndex;
              return (
                <Fragment key={tab.key}>
                  {FLOW_ARROW_BEFORE.has(tab.index) && (
                    <span aria-hidden="true" className="px-0.5 text-petrol/60">
                      <Icon name="arrow-right" className="h-4 w-4" />
                    </span>
                  )}
                  <button
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls={`tab-panel-${tab.key}`}
                    id={`tab-${tab.key}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveIndex(tab.index)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.index, setActiveIndex)}
                    className={[
                      'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-medium transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
                      active ? 'bg-petrol text-white shadow-sm' : 'text-ink hover:bg-tinted-surface',
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
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                </Fragment>
              );
            })}
            </div>
          </div>
          <div className="text-center font-mono text-[10px] tracking-wider text-ink/70 sm:pr-1 sm:text-right">
            Prices as of {PRICES_AS_OF} illustrative *
          </div>
        </div>

        {/* Active tab panel */}
        <div className="mt-4">
          {activeIndex === 0 && (
            <TabEstimate
              inputs={inputs}
              onChange={handleInputChange}
              overrides={overrides}
              onOverridesChange={setOverrides}
              misc={misc}
              onMiscChange={setMisc}
              nextMiscId={nextMiscId}
            />
          )}
          {activeIndex === 1 && (
            <TabPropose
              inputs={inputs}
              overrides={overrides}
              misc={misc}
              meta={{ ...proposalMeta, displayCurrency: currency }}
              onMetaChange={handleMetaChange}
            />
          )}
          {activeIndex === 2 && <TabBuildVsBuy inputs={inputs} />}
          {activeIndex === 3 && (
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
