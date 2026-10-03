import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock3, RotateCcw } from 'lucide-react';
import { calculateSalary, HOUR_CATEGORIES } from './calculator';
import { initialDraft, parseDraft, restoreDraft, STORAGE_KEY, WAGE_OPTIONS, type Draft } from './form';
const currency = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (amount: number) => currency.format(amount);
interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  unit?: string;
  placeholder?: string;
  large?: boolean;
  hideLabel?: boolean;
}
function Field({
  label,
  value,
  onChange,
  error,
  hint,
  unit,
  placeholder = '0',
  large = false,
  hideLabel = false,
}: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${large ? 'large-field' : ''}`}>
      <label className={hideLabel ? 'sr-only' : undefined} htmlFor={id}>
        {label}
      </label>
      <div className={`input-wrap ${error ? 'invalid' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={value}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && (
          <span className="unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? 'field-error' : 'field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
function RolePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div
      className="role-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          root.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        type="button"
        className="role-trigger"
        aria-label="תפקיד"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {WAGE_OPTIONS.find((option) => option.value === value)?.label ?? 'בחרו תפקיד'}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="role-menu" id={id} role="group" aria-label="בחירת תפקיד">
          {WAGE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === value ? 'selected' : ''}
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                root.current?.querySelector('button')?.focus();
              }}
            >
              {option.label}
              <span aria-hidden="true">{option.value === value ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function loadSaved() {
  try {
    return restoreDraft(localStorage.getItem(STORAGE_KEY));
  } catch {
    return initialDraft();
  }
}
export default function App() {
  const [savedDraft, setDraft] = useState<Draft>(loadSaved);
  const draft = useMemo(() => ({ ...initialDraft(), ...savedDraft }), [savedDraft]);
  const [storageMessage, setStorageMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
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
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  function reset() {
    changed.current = false;
    setDraft(initialDraft());
    try {
      localStorage.removeItem(STORAGE_KEY);
      setAnnouncement('');
    } catch {
      setAnnouncement('השדות אופסו, אך לא ניתן למחוק את השמירה בדפדפן');
    }
  }
  const parsed = parseDraft(draft);
  const result = parsed.valid ? calculateSalary(parsed.input) : null;
  const net = parsed.hasWage ? (result?.net ?? null) : null;
  const field = (key: keyof Draft, label: string, props: Partial<FieldProps> = {}) => (
    <Field
      label={label}
      value={String(draft[key] ?? '')}
      onChange={(value) => update(key, value)}
      error={parsed.errors[key]}
      {...props}
    />
  );
  const supplementalColumns: { key: keyof Draft; title: string }[] = [
    { key: 'shift20Hours', title: 'ת.מ 20%' },
    { key: 'largeMeals', title: 'כלכלה גדולה' },
    { key: 'smallMeals', title: 'כלכלה קטנה' },
    { key: 'saturdayTrips', title: 'נסיעות ו/ש' },
  ];
  const deductions = result
    ? [
        { label: 'מס הכנסה', amount: result.incomeTax, type: 'tax' },
        { label: 'ביטוח לאומי', amount: result.nationalInsurance, type: 'tax' },
        { label: 'ביטוח בריאות', amount: result.healthInsurance, type: 'tax' },
        { label: 'פנסיה', amount: result.pensionDeduction, type: 'saving' },
        { label: 'קרן השתלמות', amount: result.studyFundDeduction, type: 'saving' },
      ]
    : [];
  const payItems = [
    ...HOUR_CATEGORIES.map((category) => ({
      label: category.key === '187' ? 'ש״נ 187%' : category.title,
      amount: (parsed.input.hourlyWage * (parsed.input.hours[category.key] ?? 0) * category.percent) / 100,
    })),
    { label: 'ת.מ 20%', amount: parsed.input.hourlyWage * (parsed.input.shift20Hours ?? 0) * 0.2 },
    { label: 'כלכלה גדולה', amount: Number((draft.largeMeals || '0').replace(',', '.')) * 21 },
    { label: 'כלכלה קטנה', amount: Number((draft.smallMeals || '0').replace(',', '.')) * 14.5 },
    { label: 'נסיעות ו׳/ש׳', amount: (parsed.input.saturdayTrips ?? 0) * 23 },
    ...[
      { label: 'קצובת נסיעה חודשית', amount: parsed.input.travel },
      { label: 'החזרי הוצאות נוספים', amount: Number((draft.otherExpenses || '0').replace(',', '.')) },
      { label: 'הבראה', amount: parsed.input.recovery ?? 0 },
      { label: 'תוספת משמרת 50%', amount: parsed.input.hourlyWage * (parsed.input.shift50Hours ?? 0) * 0.5 },
      { label: 'תוספת כללית', amount: parsed.input.extra },
      { label: 'הפחתת שכר 1.2%', amount: -(result?.regularReduction ?? 0) },
      { label: 'הפחתת עבודה נוספת 1.2%', amount: -(result?.overtimeReduction ?? 0) },
    ].filter((item) => item.amount !== 0),
  ];
  const taxSum = result ? (result.incomeTax ?? 0) + result.nationalInsurance + result.healthInsurance : 0;
  const savingsSum = result ? result.pensionDeduction + result.studyFundDeduction : 0;
  return (
    <div className="site">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="מחשבון שכר">
          <span className="brand-mark">
            <Clock3 size={20} />
          </span>
        </a>
        <h1 className="header-title">חישוב שכר</h1>
      </header>
      <main id="main">
        <div className="calculator-layout">
          <form className="form-card" onSubmit={(e) => e.preventDefault()} aria-label="נתוני חישוב השכר">
            <div className="basics single-role">
              <div className="field">
                <div className="role-heading">
                  <RolePicker value={draft.hourlyWage} onChange={(value) => update('hourlyWage', value)} />
                  <button className="reset-top" type="button" onClick={reset}>
                    <RotateCcw size={14} />
                    איפוס
                  </button>
                </div>
              </div>
            </div>
            <section className="hours-section">
              <div className="section-heading">
                <h3>
                  <Clock3 size={17} />
                  שעות
                </h3>
              </div>
              <div className="hours-groups" role="region" aria-label="רשימת שעות לפי סוג תשלום">
                {[HOUR_CATEGORIES.slice(0, 5), HOUR_CATEGORIES.slice(5)].map((group, index) => (
                  <div className="hours-group" key={index}>
                    {group.map((category) => (
                      <div className="hours-group-cell" key={category.key}>
                        {field(`hours${category.key}`, category.accessibleLabel, { hideLabel: true, placeholder: '0' })}
                        <span className="hours-group-label">
                          {category.key === '187' ? 'ש״נ 187%' : category.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="hours-group extras-group">
                  {supplementalColumns.map((column) => (
                    <div className="hours-group-cell" key={column.key}>
                      {field(column.key, column.title, { hideLabel: true, placeholder: '0' })}
                      <span className="hours-group-label">
                        {column.key === 'saturdayTrips' ? 'נסיעות ו׳/ש׳' : column.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <div className="credits-simple">{field('creditPoints', 'נקודות זיכוי', { placeholder: '' })}</div>
            {storageMessage && (
              <p className="field-error" role="status">
                {storageMessage}
              </p>
            )}
            <p className="sr-only" role="status">
              {announcement}
            </p>
            {announcement && (
              <p className="reset-notice" aria-hidden="true">
                {announcement}
              </p>
            )}
          </form>
          <aside className="results-column" aria-label="תוצאות החישוב">
            <details className="breakdown-card collapsible-breakdown">
              <summary aria-label="ברוטו ונטו — פתיחת פירוט ההורדות">
                <div className="breakdown-totals">
                  <span>
                    <span>ברוטו</span>
                    <strong dir="ltr" data-testid="gross">
                      {result ? money(result.gross) : '—'}
                    </strong>
                  </span>
                  <span>
                    <span>נטו</span>
                    <strong dir="ltr" data-testid="net">
                      {net === null ? '—' : money(net)}
                    </strong>
                  </span>
                </div>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              {!parsed.valid ? (
                <p className="result-notice" role="status">
                  החישוב ממתין לתיקון הקלט. התוצאה תתעדכן מיד לאחר התיקון.
                </p>
              ) : (
                <>
                  <div className="salary-detail-columns">
                    <section>
                      <h3>שכר</h3>
                      <dl className="salary-detail-list">
                        {payItems.map((item) => (
                          <div key={item.label}>
                            <dt>{item.label}</dt>
                            <dd dir="ltr">{money(item.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                    <section>
                      <h3>הורדות</h3>
                      <dl className="salary-detail-list">
                        {deductions.map((item) => (
                          <div key={item.label}>
                            <dt>{item.label}</dt>
                            <dd dir="ltr">{money(item.amount ?? 0)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  </div>
                  <div className="salary-detail-totals">
                    <div>
                      <span>שכר:</span>
                      <strong dir="ltr">{result ? money(result.gross) : '—'}</strong>
                    </div>
                    <div>
                      <span>הורדות:</span>
                      <strong dir="ltr">{result?.totalDeductions == null ? '—' : money(result.totalDeductions)}</strong>
                    </div>
                  </div>
                  {net !== null && net >= 0 && result && result.gross > 0 && (
                    <div className="distribution">
                      <div
                        className="distribution-bar"
                        role="img"
                        aria-label={`נטו ${money(net)}, מסים וביטוח ${money(taxSum)}, חיסכון ${money(savingsSum)}`}
                      >
                        <span
                          className="net-segment"
                          style={{ width: `${(Math.max(0, net) / result.gross) * 100}%` }}
                        />
                        <span className="tax-segment" style={{ width: `${(taxSum / result.gross) * 100}%` }} />
                        <span className="saving-segment" style={{ width: `${(savingsSum / result.gross) * 100}%` }} />
                      </div>
                      <div className="distribution-legend">
                        <span>
                          <i className="legend-dot net" />
                          נטו
                        </span>
                        <span>
                          <i className="legend-dot tax" />
                          מסים וביטוח
                        </span>
                        <span>
                          <i className="legend-dot saving" />
                          החיסכון שלך
                        </span>
                      </div>
                    </div>
                  )}
                  {net !== null && net < 0 && (
                    <p className="field-error">סך ההורדות גבוה מהברוטו. כדאי לבדוק את אחוזי ההפרשה והשכר הקובע.</p>
                  )}
                </>
              )}
            </details>
          </aside>
        </div>
      </main>
    </div>
  );
}
