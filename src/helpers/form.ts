import { HOUR_CATEGORIES, type SalaryInput } from './calculator';
export const WAGE_OPTIONS = [
  { value: '57.85', label: 'קמ״ת - 57.85₪' },
  { value: '56.13', label: 'אחמ״ש - 56.13₪' },
  { value: '54.42', label: 'מאבטח - 54.42₪' },
];
export interface Draft {
  hourlyWage: string;
  hours100: string;
  hours125: string;
  hours150: string;
  hours200: string;
  hoursabsence: string;
  hourssaturdayAccount: string;
  hourssaturday150: string;
  hoursnight150: string;
  hours187: string;
  hours225: string;
  creditPoints: string;
  travel: string;
  extra: string;
  month: string;
  largeMeals: string;
  smallMeals: string;
  travelEnabled: boolean;
  saturdayTrips: string;
  otherExpenses: string;
  recovery: string;
  shift20Hours: string;
}
export const initialDraft = (): Draft => ({
  hourlyWage: '',
  hours100: '',
  hours125: '',
  hours150: '',
  hours200: '',
  hoursabsence: '',
  hourssaturdayAccount: '',
  hourssaturday150: '',
  hoursnight150: '',
  hours187: '',
  hours225: '',
  creditPoints: '',
  travel: '323',
  extra: '',
  month: new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', month: 'numeric' }).format(new Date()),
  largeMeals: '',
  smallMeals: '',
  travelEnabled: true,
  saturdayTrips: '',
  otherExpenses: '',
  recovery: '',
  shift20Hours: '',
});
export function parseDraft(draft: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};
  function number(key: keyof Draft, maximum = 1e9) {
    const text = String(draft[key] ?? '').trim();
    if (!text) return 0;
    if (!/^\d+(?:[.,]\d+)?$/.test(text)) {
      errors[key] = 'יש להזין מספר חיובי או אפס';
      return 0;
    }
    const value = Number(text.replace(',', '.'));
    if (!Number.isFinite(value) || value > maximum) {
      errors[key] = `יש להזין ערך עד ${maximum.toLocaleString('he-IL')}`;
      return 0;
    }
    return value;
  }
  const hourlyWage = number('hourlyWage', 100000);
  const hours = Object.fromEntries(
    HOUR_CATEGORIES.map((category) => [category.key, number(`hours${category.key}`, 744)]),
  ) as SalaryInput['hours'];
  if (Object.values(hours).reduce((sum, h) => sum + (h ?? 0), 0) > 744)
    errors.hours100 = 'סך השעות החודשי לא יכול לעלות על 744';
  const creditPoints = draft.creditPoints.trim() === '' ? null : number('creditPoints', 1000);
  const travel =
      draft.travelEnabled &&
      hourlyWage > 0 &&
      Object.values(hours).some((value) => (value ?? 0) > 0) &&
      creditPoints !== null
        ? number('travel')
        : 0,
    extra = number('extra');
  const saturdayTrips = number('saturdayTrips', 31),
    otherExpenses = number('otherExpenses') + number('largeMeals', 744) * 21.1 + number('smallMeals', 744) * 14.5,
    recovery = number('recovery');
  if (!Number.isInteger(saturdayTrips)) errors.saturdayTrips = 'יש להזין מספר נסיעות שלם';
  const shift20Hours = number('shift20Hours', 744);
  const gross =
    HOUR_CATEGORIES.reduce(
      (sum, category) => sum + ((hours[category.key] ?? 0) * hourlyWage * category.percent) / 100,
      travel + extra + saturdayTrips * 23 + otherExpenses + recovery,
    ) +
    hourlyWage * shift20Hours * 0.2;
  const pension = { enabled: true, percent: 7, base: null };
  const studyFund = { enabled: true, percent: 2.5, base: null };
  const month = Number(draft.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) errors.month = 'יש לבחור חודש תקין';
  if (gross > 1e9) errors.hourlyWage = 'הברוטו חורג מטווח החישוב';
  const input: SalaryInput = {
    fixedProfile: true,
    recovery,
    saturdayTrips,
    otherExpenses,
    shift20Hours,
    year: 2026,
    month,
    hourlyWage,
    hours,
    creditPoints,
    travel,
    extra,
    pension,
    studyFund,
  };
  return { input, errors, valid: Object.keys(errors).length === 0, hasWage: draft.hourlyWage.trim() !== '' };
}
export const STORAGE_KEY = 'good-hours-salary-v1';
export function restoreDraft(raw: string | null): Draft {
  const defaults = initialDraft();
  if (!raw) return defaults;
  try {
    const payload: unknown = JSON.parse(raw);
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('version' in payload) ||
      payload.version !== 1 ||
      !('draft' in payload)
    )
      return defaults;
    const saved = payload.draft;
    if (!saved || typeof saved !== 'object') return defaults;
    for (const key of Object.keys(defaults) as (keyof Draft)[]) {
      if (!(key in saved)) continue;
      if (key === 'travel' && !('travelEnabled' in saved) && (saved as Record<string, unknown>).travel === '') continue;
      const value = (saved as Record<string, unknown>)[key];
      if (typeof defaults[key] === 'boolean' && typeof value === 'boolean') Object.assign(defaults, { [key]: value });
      if (typeof defaults[key] === 'string' && typeof value === 'string' && value.length <= 32)
        Object.assign(defaults, { [key]: value });
    }
    if (!WAGE_OPTIONS.some((option) => option.value === defaults.hourlyWage)) defaults.hourlyWage = '';
    return parseDraft(defaults).valid ? defaults : initialDraft();
  } catch {
    return defaults;
  }
}
