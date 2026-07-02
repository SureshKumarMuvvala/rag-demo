import { useRef, useState } from 'react';
import Hero from './components/Hero';
import TabEstimate from './components/TabEstimate';
import { DEFAULT_INPUTS, DEFAULT_MISC } from './lib/types';
import type { Inputs, MiscItem, Overrides } from './lib/types';
import { CurrencyProvider } from './lib/currency';

export default function App() {
  return (
    <CurrencyProvider>
      <AppInner />
    </CurrencyProvider>
  );
}

function AppInner() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  // Seed the default scenario to the Excel's pricing (editable): the LLM is
  // priced like GPT-4o mini ($0.15/$0.60) and reranking at the Excel's rate.
  const [overrides, setOverrides] = useState<Overrides>(() => ({
    genModel: { in: 0.15, out: 0.6, name: 'GPT-4o mini' },
    reranker: { per1k: 1.8, name: 'Cohere Rerank v3' },
  }));
  const [misc, setMisc] = useState<MiscItem[]>(() => DEFAULT_MISC.map((m) => ({ ...m })));

  const miscCounter = useRef(0);
  const nextMiscId = () => `misc-${miscCounter.current++}`;

  const handleInputChange = (patch: Partial<Inputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-full rag-scroll">
      <div className="mx-auto w-full max-w-7xl px-5 pb-4 pt-2 md:pb-5 md:pt-3">
        <Hero />

        <div className="mt-3">
          <TabEstimate
            inputs={inputs}
            onChange={handleInputChange}
            overrides={overrides}
            onOverridesChange={setOverrides}
            misc={misc}
            onMiscChange={setMisc}
            nextMiscId={nextMiscId}
          />
        </div>
      </div>
    </div>
  );
}
