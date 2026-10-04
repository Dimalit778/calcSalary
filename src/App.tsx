import { useEffect, useRef, useState } from 'react';
import { calculateSalary } from './helpers/calculator';
import Breakdown from './components/Breakdown/Breakdown';
import Header from './components/Header/Header';
import SalaryForm from './components/SalaryForm/SalaryForm';
import { initialDraft, parseDraft, restoreDraft, STORAGE_KEY, type Draft } from './helpers/form';
import './App.css';

function loadSaved() {
  try {
    return restoreDraft(localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialDraft();
  }
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(loadSaved);
  const [storageMessage, setStorageMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [calculation, setCalculation] = useState<{
    draft: Draft;
    parsed: ReturnType<typeof parseDraft>;
    result: ReturnType<typeof calculateSalary>;
  } | null>(null);
  const changed = useRef(false);
  useEffect(() => {
    if (!changed.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, draft }));
      setStorageMessage('');
    } catch {
      setStorageMessage('השמירה בדפדפן אינה זמינה. אפשר להמשיך לחשב.');
    }
  }, [draft]);
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    changed.current = true;
    setAnnouncement('');
    setCalculation(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  function reset() {
    changed.current = false;
    setStorageMessage('');
    setDraft(initialDraft());
    setCalculation(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setAnnouncement('');
    } catch {
      setAnnouncement('השדות אופסו, אך לא ניתן למחוק את השמירה בדפדפן');
    }
  }
  const parsed = parseDraft(draft);
  const canCalculate = parsed.valid && parsed.hasWage && parsed.input.creditPoints !== null;
  function calculate() {
    if (!canCalculate) return;
    setCalculation({ draft: { ...draft }, parsed, result: calculateSalary(parsed.input) });
  }
  return (
    <div className="site">
      <Header />
      <main id="main">
        <div className="calculator-layout">
          <SalaryForm
            draft={draft}
            errors={parsed.errors}
            storageMessage={storageMessage}
            announcement={announcement}
            onUpdate={update}
            onReset={reset}
            onCalculate={calculate}
            canCalculate={canCalculate}
            showCalculate={!calculation}
          />
          {calculation && (
            <Breakdown
              draft={calculation.draft}
              parsed={calculation.parsed}
              result={calculation.result}
              net={calculation.result.net}
            />
          )}
        </div>
      </main>
    </div>
  );
}
