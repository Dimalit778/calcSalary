// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { calculateSalary } from './helpers/calculator';
const expected = (key: 'gross' | 'net') =>
  new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    calculateSalary(parseDraft(restoreDraft(localStorage.getItem(STORAGE_KEY))).input)[key] ?? 0,
  );
import { initialDraft, parseDraft, restoreDraft, STORAGE_KEY, WAGE_OPTIONS } from './helpers/form';
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const fill = (name: string, value: string) => {
  if (name === 'תפקיד') {
    fireEvent.click(screen.getByLabelText(name, { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: WAGE_OPTIONS.find((option) => option.value === value)!.label }));
  } else fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value } });
};
const calculate = () => fireEvent.click(screen.getByRole('button', { name: /^חשב$/ }));
it('waits for a role and numeric credit points, then calculates only on click', () => {
  render(<App />);
  fill('תפקיד', '57.85');
  fill('שעות רגילות', '150');
  expect(screen.queryByTestId('gross')).toBeNull();
  expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(true);
  calculate();
  expect(screen.queryByTestId('net')).toBeNull();
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('net').textContent).toContain(expected('net'));
  expect(screen.queryByLabelText('אחוז הפרשת עובד')).toBeNull();
  expect(screen.queryByLabelText('שכר קובע לפנסיה')).toBeNull();
});
it('saves new expenses and restores them on reload', () => {
  const view = render(<App />);
  fill('תפקיד', '56.13');
  fill('שעות רגילות', '160');
  fill('נסיעות ו/ש', '6');
  view.unmount();
  render(<App />);
  expect((screen.getByLabelText('נסיעות ו/ש') as HTMLInputElement).value).toBe('6');
  expect(screen.getByLabelText('תפקיד').textContent).toContain('56.13');
});
it('hides contribution and expense sections and rejects invalid values', () => {
  render(<App />);
  fill('תפקיד', '57.85');
  fill('שעות רגילות', '150');
  fill("נק' זיכוי מס", '2.25');
  expect(screen.queryByLabelText('כולל קצובת נסיעה חודשית')).toBeNull();
  fill('שעות רגילות', '-2');
  expect(screen.getByLabelText('שעות רגילות').getAttribute('aria-invalid')).toBe('true');
  fill('שעות רגילות', '150');
  calculate();
  expect(screen.getByTestId('net').textContent).toContain(expected('net'));
  fill('נסיעות ו/ש', '1.5');
  expect(screen.getByLabelText('נסיעות ו/ש').getAttribute('aria-invalid')).toBe('true');
});
it('removes the stored data on reset', () => {
  render(<App />);
  fill('תפקיד', '54.42');
  fireEvent.click(screen.getByRole('button', { name: 'איפוס' }));
  expect(screen.queryByTestId('gross')).toBeNull();
  expect(screen.getByRole('button', { name: 'חשב' })).toBeDefined();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(screen.getByLabelText('תפקיד').textContent).toContain('בחר תפקיד');
});
it('continues to calculate without storage', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  render(<App />);
  fill('תפקיד', '57.85');
  fill('שעות רגילות', '150');
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('net').textContent).toContain('7,381.96');
  expect(screen.getByText(/השמירה בדפדפן אינה זמינה/)).toBeDefined();
});
it('preserves prior hours and travel but ignores old configurable contribution settings', () => {
  const saved = restoreDraft(
    JSON.stringify({
      version: 1,
      draft: { hours100: '160', travel: '200', pensionPercent: '99', pensionEnabled: false, studyFundEnabled: false },
    }),
  );
  expect(saved.hours100).toBe('160');
  expect(saved.travel).toBe('200');
  expect(parseDraft(saved).input.fixedProfile).toBe(true);
  expect(parseDraft(saved).input.pension.percent).toBe(7);
  expect(parseDraft(saved).input.studyFund.enabled).toBe(true);
  expect(restoreDraft('{')).toEqual(initialDraft());
  expect(parseDraft({ ...initialDraft(), hours100: '700', hours125: '100' }).valid).toBe(false);
});
it('shows fourteen vertical fields including the corrected 187.5% rate', () => {
  render(<App />);
  expect(within(screen.getByRole('region', { name: 'רשימת שדות של שעות' })).getAllByRole('textbox')).toHaveLength(
    14,
  );
  expect(screen.getByLabelText('שעות בתעריף 187.5%')).toBeDefined();
  fill('תפקיד', '54.42');
  fill('שעות היעדרות', '2');
  fill('שעות ע״ח שבת', '3');
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('gross').textContent).toContain(expected('gross'));
});

it('calculates meal units, weekend travel and shift premium without duplicating hours', () => {
  const draft = {
    ...initialDraft(),
    hourlyWage: '50',
    hours100: '10',
    shift20Hours: '4',
    largeMeals: '2',
    smallMeals: '3',
    saturdayTrips: '2',
    travelEnabled: false,
  };
  const parsed = parseDraft(draft);
  expect(parsed.valid).toBe(true);
  expect(parsed.input.otherExpenses).toBe(85.7);
  render(<App />);
  fill('תפקיד', '54.42');
  fill('שעות רגילות', '10');
  fill('ת.מ 20%', '4');
  fill('כלכלה גדולה', '2');
  fill('כלכלה קטנה', '3');
  fill('נסיעות ו/ש', '2');
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('gross').textContent).toContain(expected('gross'));
  const stored = restoreDraft(localStorage.getItem(STORAGE_KEY));
  expect(stored.largeMeals).toBe('2');
  expect(stored.smallMeals).toBe('3');
  fill('כלכלה גדולה', '-1');
  expect(screen.getByLabelText('כלכלה גדולה').getAttribute('aria-invalid')).toBe('true');
});

it('offers four predefined wages and restores the selected role', () => {
  const view = render(<App />);
  const select = screen.getByLabelText('תפקיד');
  expect(select.tagName).toBe('BUTTON');
  expect(select.getAttribute('aria-expanded')).toBe('false');
  fill('תפקיד', '57.85');
  fill('שעות רגילות', '100');
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('gross').textContent).toContain('6,038.58');
  view.unmount();
  render(<App />);
  expect(screen.getByLabelText('תפקיד').textContent).toContain('57.85');
  expect(restoreDraft(JSON.stringify({ version: 1, draft: { hourlyWage: '40', hours100: '100' } })).hourlyWage).toBe(
    '',
  );
});

it('keeps automatic contributions and travel active while hiding their form sections', () => {
  render(<App />);
  expect(screen.queryByText('החזרי נסיעות', { exact: true })).toBeNull();
  expect(screen.queryByText('תוספות והחזרי הוצאות', { exact: true })).toBeNull();
  expect(screen.queryByText('פנסיה וקרן השתלמות', { exact: true })).toBeNull();
  fill('תפקיד', '57.85');
  fill('שעות רגילות', '100');
  fill("נק' זיכוי מס", '2.25');
  calculate();
  expect(screen.getByTestId('gross').textContent).toContain('6,038.58');
  expect(screen.getByText('פנסיה', { exact: true })).toBeDefined();
});

it('adds monthly travel only once wage, hours and credits are complete', () => {
  const base = { ...initialDraft(), hourlyWage: '57.85', hours100: '100' };
  expect(parseDraft(base).input.travel).toBe(0);
  expect(parseDraft({ ...base, creditPoints: '0' }).input.travel).toBe(323);
  expect(parseDraft({ ...base, hours100: '', creditPoints: '2.25' }).input.travel).toBe(0);
});

it('removes payslip reconciliation controls and ignores their old saved values', () => {
  const draft = {
    ...initialDraft(), hourlyWage: '44.13', hours100: '150', creditPoints: '7.25',
    taxableBenefits: '500', arrearsPayments: '2000', arrearsDeductions: '250',
    cumulativeTaxEnabled: true, cumulativeTaxableIncome: '75000',
    cumulativePensionCredit: '1400', taxPaidBeforeMonth: '0',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, draft }));
  render(<App />);
  expect(screen.queryByText(/התאמה לתלוש/)).toBeNull();
  expect(screen.queryByLabelText('חישוב מס מצטבר לפי התלוש')).toBeNull();
  expect(screen.queryByLabelText('הבראה חודשית')).toBeNull();
  const restored = restoreDraft(localStorage.getItem(STORAGE_KEY));
  expect(restored.hours100).toBe('150');
  const r = calculateSalary(parseDraft(restored).input);
  expect(r.cumulativeTax).toBe(false);
  expect(r.taxableBenefits).toBe(0);
  expect(r.arrearsPayments).toBe(0);
  expect(r.arrearsDeductions).toBe(0);
  calculate();
  expect(screen.getByTestId('net').textContent).toContain(expected('net'));
});

it('accepts zero credits, opens the entire breakdown, and returns to the button on reset', () => {
  render(<App />);
  fill("נק' זיכוי מס", '0');
  expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(true);
  fill('תפקיד', '57.85');
  expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByTestId('gross')).toBeNull();
  calculate();
  expect(screen.queryByRole('button', { name: 'חשב' })).toBeNull();
  expect(screen.getByLabelText('תוצאות החישוב').querySelector('details')?.open).toBe(true);
  expect(screen.getByText('מס הכנסה', { exact: true })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'איפוס' }));
  expect(screen.queryByLabelText('תוצאות החישוב')).toBeNull();
  expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(true);
});

it('requires another click after editing and does not restore calculated results on reload', () => {
  const view = render(<App />);
  fill('תפקיד', '57.85');
  fill("נק' זיכוי מס", '2.25');
  fill('שעות רגילות', '100');
  calculate();
  fill('שעות רגילות', '150');
  expect(screen.queryByTestId('net')).toBeNull();
  calculate();
  expect(screen.getByTestId('net').textContent).toContain(expected('net'));
  view.unmount();
  render(<App />);
  expect(screen.queryByTestId('net')).toBeNull();
  expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(false);
});

it('blocks invalid credit points and supports submitting the form', () => {
  render(<App />);
  fill('תפקיד', '57.85');
  for (const value of ['abc', '-1', '']) {
    fill("נק' זיכוי מס", value);
    expect((screen.getByRole('button', { name: 'חשב' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'נתוני חישוב השכר' }));
    expect(screen.queryByTestId('net')).toBeNull();
  }
  fill("נק' זיכוי מס", '2.25');
  fireEvent.submit(screen.getByRole('form', { name: 'נתוני חישוב השכר' }));
  expect(screen.getByTestId('net')).toBeDefined();
});
