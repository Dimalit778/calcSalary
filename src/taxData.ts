/** Verified against the April 2026 Tax Authority booklet, pp. 10–12,
 * and the National Insurance employee rates table on 2026-10-03.
 * The March tax-bracket expansion applies retroactively from January 1. */
export const SOURCES = {
  booklet:
    'https://www.gov.il/BlobFolder/generalpage/income-tax-monthly-deductions-booklet/he/generalInformation_income-tax-monthly-deductions-booklet_monthly-deductions-booklet-2026.pdf',
  tax: 'https://www.gov.il/he/pages/income-tax-monthly-deductions-booklet',
  insurance: 'https://www.btl.gov.il/Insurance/Rates/Pages/לעובדים%20שכירים.aspx',
  simulator: 'https://secapp.taxes.gov.il/srsimulatorNZ/#/simulatorMasHachnasah',
  pensionCredit: 'https://www.btl.gov.il/Laws1/02_0103_000000.pdf',
};
export const TAX_PERIODS = [
  {
    year: 2026,
    effectiveFromMonth: 1,
    verifiedAt: '2026-10-03',
    brackets: [
      { ceiling: 7010, rate: 0.1 },
      { ceiling: 10060, rate: 0.14 },
      { ceiling: 19000, rate: 0.2 },
      { ceiling: 25100, rate: 0.31 },
      { ceiling: 46690, rate: 0.35 },
      { ceiling: Infinity, rate: 0.47 },
    ],
    creditPoint: 242,
    surtax: { threshold: 60130, rate: 0.03 },
    pensionCredit: { incomeCeiling: 9700, eligibleRate: 0.07, creditRate: 0.35, minimumEligibleDeposit: 189 },
    insurance: {
      reducedCeiling: 7703,
      maximumIncome: 51910,
      nationalReduced: 0.0104,
      nationalFull: 0.07,
      healthReduced: 0.0323,
      healthFull: 0.0517,
    },
  },
] as const;
export function taxPeriod(year: number, month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('חודש לא תקין');
  const period = [...TAX_PERIODS].reverse().find((p) => p.year === year && p.effectiveFromMonth <= month);
  if (!period) throw new Error('שנת המס אינה נתמכת');
  return period;
}
