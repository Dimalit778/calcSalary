import { ChevronDown } from 'lucide-react';
import { HOUR_CATEGORIES, calculateSalary } from '../../helpers/calculator';
import { parseDraft, type Draft } from '../../helpers/form';
import { money } from '../../helpers/money';
import './Breakdown.css';

interface BreakdownProps {
  draft: Draft;
  parsed: ReturnType<typeof parseDraft>;
  result: ReturnType<typeof calculateSalary> | null;
  net: number | null;
}

export default function Breakdown({ draft, parsed, result, net }: BreakdownProps) {
  const deductions = result
    ? [
        { label: 'מס הכנסה', amount: result.incomeTax },
        { label: 'ביטוח לאומי', amount: result.nationalInsurance },
        { label: 'ביטוח בריאות', amount: result.healthInsurance },
        { label: 'פנסיה', amount: result.pensionDeduction },
        { label: 'קרן השתלמות', amount: result.studyFundDeduction },
      ]
    : [];
  const payItems = [
    ...HOUR_CATEGORIES.map((category) => ({
      label: category.title,
      amount: result?.wages[category.key] ?? 0,
    })),
    { label: 'ת.מ 20%', amount: result?.shift20Wage ?? 0 },
    { label: 'כלכלה גדולה', amount: Number((draft.largeMeals || '0').replace(',', '.')) * 21.1 },
    { label: 'כלכלה קטנה', amount: Number((draft.smallMeals || '0').replace(',', '.')) * 14.5 },
    { label: 'נסיעות ו׳/ש׳', amount: (parsed.input.saturdayTrips ?? 0) * 23 },
    ...[
      { label: 'קצובת נסיעה חודשית', amount: parsed.input.travel },
      { label: 'החזרי הוצאות נוספים', amount: Number((draft.otherExpenses || '0').replace(',', '.')) },
      { label: 'הבראה', amount: parsed.input.recovery ?? 0 },
      { label: 'תוספת כללית', amount: parsed.input.extra },
      { label: 'הפחתת שכר 1.2%', amount: -(result?.regularReduction ?? 0) },
      { label: 'הפחתת עבודה נוספת 1.2%', amount: -(result?.overtimeReduction ?? 0) },
    ].filter((item) => item.amount !== 0),
  ];
  const taxSum = result ? (result.incomeTax ?? 0) + result.nationalInsurance + result.healthInsurance : 0;
  const savingsSum = result ? result.pensionDeduction + result.studyFundDeduction : 0;
  return (
    <aside className="results-column" aria-label="תוצאות החישוב">
      <details className="breakdown-card collapsible-breakdown" open>
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
            {net !== null && net >= 0 && result && result.gross > 0 && !result.arrearsPayments && !result.arrearsDeductions && (result.incomeTax ?? 0) >= 0 && (
              <div className="distribution">
                <div
                  className="distribution-bar"
                  role="img"
                  aria-label={`נטו ${money(net)}, מסים וביטוח ${money(taxSum)}, חיסכון ${money(savingsSum)}`}
                >
                  <span className="net-segment" style={{ width: `${(Math.max(0, net) / result.gross) * 100}%` }} />
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
              <p className="breakdown-warning">סך ההורדות גבוה מהברוטו. כדאי לבדוק את אחוזי ההפרשה והשכר הקובע.</p>
            )}
          </>
        )}
      </details>
    </aside>
  );
}
