import { useRef, useState } from 'react';
import Hero from './components/Hero';
import TabEstimate from './components/TabEstimate';
import { DEFAULT_INPUTS, DEFAULT_MISC } from './lib/types';
import type { Inputs, MiscItem, Overrides } from './lib/types';
import { PRICES_AS_OF } from './lib/rates';
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
  const [overrides, setOverrides] = useState<Overrides>({});
  const [misc, setMisc] = useState<MiscItem[]>(() => DEFAULT_MISC.map((m) => ({ ...m })));

  const miscCounter = useRef(0);
  const nextMiscId = () => `misc-${miscCounter.current++}`;

  const handleInputChange = (patch: Partial<Inputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-full rag-scroll">
      <div className="mx-auto w-full max-w-7xl px-5 py-4 md:py-5">
        <Hero />

        <div className="mt-3 text-center font-mono text-[10px] tracking-wider text-ink/60 sm:text-right">
          Prices as of {PRICES_AS_OF} · illustrative *
        </div>

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
