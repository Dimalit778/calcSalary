import { taxPeriod } from '../taxData';
export type HourRate = '100' | '125' | '150' | '200';
export const HOUR_RATES: HourRate[] = ['100', '125', '150', '200'];
export type AdditionalHour = 'absence' | 'saturdayAccount' | 'saturday150' | 'night150' | '187' | '225';
export type HourCategory = HourRate | AdditionalHour;
export const HOUR_CATEGORIES: {
  key: HourCategory;
  title: string;
  percent: number;
  regular: boolean;
  accessibleLabel: string;
}[] = [
  { key: 'absence', title: 'היעדרות', percent: 100, regular: true, accessibleLabel: 'שעות היעדרות' },
  { key: 'saturdayAccount', title: 'ע״ח שבת', percent: 100, regular: true, accessibleLabel: 'שעות ע״ח שבת' },
  { key: '100', title: 'ש״נ 100%', percent: 100, regular: true, accessibleLabel: 'שעות רגילות' },
  { key: '125', title: 'ש״נ 125%', percent: 125, regular: false, accessibleLabel: 'שעות בתעריף 125%' },
  { key: '150', title: 'ש״נ 150%', percent: 150, regular: false, accessibleLabel: 'שעות בתעריף 150%' },
  { key: 'saturday150', title: 'שבת 150%', percent: 150, regular: false, accessibleLabel: 'שעות שבת 150%' },
  { key: '200', title: 'שבת 200%', percent: 200, regular: false, accessibleLabel: 'שעות בתעריף 200%' },
  { key: 'night150', title: 'לילה 150%', percent: 150, regular: false, accessibleLabel: 'שעות לילה 150%' },
  { key: '187', title: 'ש״נ 187.5%', percent: 187.5, regular: false, accessibleLabel: 'שעות בתעריף 187.5%' },
  { key: '225', title: 'ש״נ 225%', percent: 225, regular: false, accessibleLabel: 'שעות בתעריף 225%' },
];
export interface Contribution {
  enabled: boolean;
  percent: number;
  base: number | null;
}
export interface SalaryInput {
  taxableBenefits?: number;
  arrearsPayments?: number;
  arrearsDeductions?: number;
  /** Totals from the selected month's payslip, including that month.
   * Assumes unchanged credit points from January through the selected month. */
  cumulativeTax?: { taxableIncome: number; pensionCredit: number; taxPaidBeforeMonth: number };
  fixedProfile?: boolean;
  recovery?: number;
  otherExpenses?: number;
  saturdayTrips?: number;
  shift20Hours?: number;
  shift50Hours?: number;
  year: number;
  month: number;
  hourlyWage: number;
  hours: Record<HourRate, number> & Partial<Record<AdditionalHour, number>>;
  creditPoints: number | null;
  travel: number;
  extra: number;
  pension: Contribution;
  studyFund: Contribution;
}
export const roundMoney = (value: number) => Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1e9) throw new Error(`ערך לא תקין: ${label}`);
}
export function calculateSalary(input: SalaryInput) {
  const period = taxPeriod(input.year, input.month);
  positive(input.hourlyWage, 'שכר לשעה');
  positive(input.travel, 'נסיעות');
  positive(input.extra, 'תוספת');
  if (input.creditPoints !== null) positive(input.creditPoints, 'נקודות זיכוי');
  for (const category of HOUR_CATEGORIES) positive(input.hours[category.key] ?? 0, 'שעות');
  const wages = Object.fromEntries(
    HOUR_CATEGORIES.map((category) => [
      category.key,
      input.fixedProfile
        ? roundMoney(roundMoney(input.hourlyWage * category.percent / 100) * (input.hours[category.key] ?? 0))
        : (input.hourlyWage * (input.hours[category.key] ?? 0) * category.percent) / 100,
    ]),
  ) as Record<HourCategory, number>;
  const categoryWage = HOUR_CATEGORIES.reduce((sum, category) => sum + wages[category.key], 0);
  for (const value of [
    input.recovery,
    input.otherExpenses,
    input.saturdayTrips,
    input.shift20Hours,
    input.shift50Hours,
    input.taxableBenefits,
    input.arrearsPayments,
    input.arrearsDeductions,
  ])
    positive(value ?? 0, 'תוספות');
  const shift50Hours = input.shift50Hours ?? 0;
  const shift20Wage = input.fixedProfile
    ? roundMoney(roundMoney(input.hourlyWage * 0.2) * (input.shift20Hours ?? 0))
    : input.hourlyWage * 0.2 * (input.shift20Hours ?? 0);
  const shift50Wage = input.fixedProfile
    ? roundMoney(roundMoney(input.hourlyWage * 0.5) * shift50Hours)
    : input.hourlyWage * 0.5 * shift50Hours;
  const shiftPremium = shift20Wage + shift50Wage;
  const hoursWage = categoryWage + shiftPremium;
  const regularWage = HOUR_CATEGORIES.filter((category) => category.regular).reduce(
    (sum, category) => sum + wages[category.key],
    0,
  );
  const overtimeWage = hoursWage - regularWage;
  const expenses = input.travel + (input.otherExpenses ?? 0) + (input.saturdayTrips ?? 0) * 23;
  const recovery = input.recovery ?? 0;
  const regularReduction = input.fixedProfile ? roundMoney(regularWage * 0.012) : 0;
  const overtimeReduction = input.fixedProfile ? roundMoney(overtimeWage * 0.012) : 0;
  const rawGross = hoursWage + expenses + input.extra + recovery - regularReduction - overtimeReduction;
  if (!Number.isFinite(rawGross) || rawGross > 1e9) throw new Error('הברוטו חורג מטווח החישוב');
  const taxableIncome = roundMoney(roundMoney(rawGross) + roundMoney(input.taxableBenefits ?? 0));
  const cashGross = roundMoney(roundMoney(rawGross) + roundMoney(input.arrearsPayments ?? 0));
  if (taxableIncome > 1e9 || cashGross > 1e9) throw new Error('הברוטו חורג מטווח החישוב');
  const taxMonths = input.cumulativeTax ? input.month : 1;
  if (input.cumulativeTax) {
    for (const value of Object.values(input.cumulativeTax)) positive(value, 'נתוני מס מצטברים');
  }
  const assessedIncome = input.cumulativeTax?.taxableIncome ?? taxableIncome;
  const regularBase = regularWage + recovery;
  const fixedStudyBase = Math.max(0, regularBase - regularReduction);
  function contribution(value: Contribution) {
    if (!value.enabled) return { base: 0, amount: 0 };
    positive(value.percent, 'אחוז הפרשה');
    if (value.percent > 100) throw new Error('אחוז הפרשה לא יכול להיות מעל 100');
    const base = value.base ?? regularBase;
    positive(base, 'שכר קובע');
    if (base > rawGross) throw new Error('השכר הקובע לא יכול להיות גבוה מהברוטו');
    return { base, amount: (base * value.percent) / 100 };
  }
  const pension = input.fixedProfile
    ? { base: regularBase, amount: regularBase * 0.07 + overtimeWage * 0.07 + expenses * 0.05 }
    : contribution(input.pension);
  const studyFund = input.fixedProfile
    ? { base: fixedStudyBase, amount: fixedStudyBase * 0.025 }
    : contribution(input.studyFund);
  const employerPension = input.fixedProfile
    ? roundMoney(roundMoney(regularBase * 0.075) + roundMoney(overtimeWage * 0.075) + roundMoney(expenses * 0.05))
    : 0;
  const employerSeverance = input.fixedProfile
    ? roundMoney(roundMoney(regularBase * 0.06) + roundMoney(overtimeWage * 0.06))
    : 0;
  const employerStudyFund = input.fixedProfile ? roundMoney(fixedStudyBase * 0.075) : 0;
  if (pension.amount + studyFund.amount > rawGross) throw new Error('סך ההפרשות גבוה מהברוטו');
  let previous = 0,
    taxBeforeCredits = 0;
  const taxSlices = period.brackets.map((bracket) => {
    const income = Math.max(0, Math.min(assessedIncome, bracket.ceiling * taxMonths) - previous);
    previous = bracket.ceiling * taxMonths;
    const tax = income * bracket.rate;
    taxBeforeCredits += tax;
    return { income, rate: bracket.rate, tax };
  });
  const surtax = Math.max(0, assessedIncome - period.surtax.threshold * taxMonths) * period.surtax.rate;
  const pointCredit = (input.creditPoints ?? 0) * period.creditPoint * taxMonths;
  // Standard employee contribution only. No independent deposits/life insurance.
  // Section 45a also permits the minimum qualifying deposit (189/month in 2026).
  const eligiblePensionDeposit = Math.min(
    pension.amount,
    Math.max(
      period.pensionCredit.minimumEligibleDeposit,
      Math.min(
        input.fixedProfile ? regularBase + overtimeWage + expenses : pension.base,
        period.pensionCredit.incomeCeiling,
      ) * period.pensionCredit.eligibleRate,
    ),
  );
  const pensionCredit = eligiblePensionDeposit * period.pensionCredit.creditRate;
  const incomeTax =
    input.creditPoints === null
      ? null
      : roundMoney(Math.max(0, taxBeforeCredits + surtax - pointCredit - (input.cumulativeTax?.pensionCredit ?? pensionCredit))
          - (input.cumulativeTax?.taxPaidBeforeMonth ?? 0));
  const insured = Math.min(taxableIncome, period.insurance.maximumIncome);
  const reduced = Math.min(insured, period.insurance.reducedCeiling);
  const full = Math.max(0, insured - reduced);
  const insuranceAmount = (reducedRate: number, fullRate: number) => input.fixedProfile
    ? roundMoney(roundMoney(reduced * reducedRate) + roundMoney(full * fullRate))
    : roundMoney(reduced * reducedRate + full * fullRate);
  const nationalInsurance = insuranceAmount(period.insurance.nationalReduced, period.insurance.nationalFull);
  const healthInsurance = insuranceAmount(period.insurance.healthReduced, period.insurance.healthFull);
  const pensionDeduction = input.fixedProfile
      ? roundMoney(roundMoney(regularBase * 0.07) + roundMoney(overtimeWage * 0.07) + roundMoney(expenses * 0.05))
      : roundMoney(pension.amount),
    studyFundDeduction = roundMoney(studyFund.amount);
  const gross = roundMoney(rawGross);
  // Sum the displayed deductions so the displayed net reconciles to the cent.
  const arrearsPayments = roundMoney(input.arrearsPayments ?? 0);
  const arrearsDeductions = roundMoney(input.arrearsDeductions ?? 0);
  const knownDeductions = roundMoney(nationalInsurance + healthInsurance + pensionDeduction + studyFundDeduction + arrearsDeductions);
  const totalDeductions = incomeTax === null ? null : roundMoney(knownDeductions + incomeTax);
  const net = totalDeductions === null ? null : roundMoney(cashGross - totalDeductions);
  return {
    gross,
    cashGross,
    taxableIncome,
    taxableBenefits: input.taxableBenefits ?? 0,
    arrearsPayments,
    arrearsDeductions,
    cumulativeTax: !!input.cumulativeTax,
    shift20Wage,
    shift50Wage,
    hoursWage,
    wages,
    expenses,
    recovery,
    regularReduction,
    overtimeReduction,
    overtimeWage,
    employerPension,
    employerSeverance,
    employerStudyFund,
    totalHours: HOUR_CATEGORIES.reduce((sum, category) => sum + (input.hours[category.key] ?? 0), 0),
    regularBase,
    pensionBase: pension.base,
    studyFundBase: studyFund.base,
    pensionDeduction,
    studyFundDeduction,
    nationalInsurance,
    healthInsurance,
    incomeTax,
    taxBeforeCredits,
    surtax,
    pointCredit,
    pensionCredit,
    taxSlices,
    knownDeductions,
    totalDeductions,
    net,
  };
}
