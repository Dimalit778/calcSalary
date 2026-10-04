import { describe, expect, it } from 'vitest';
import { calculateSalary, roundMoney, type SalaryInput } from './calculator';
import { taxPeriod } from '../taxData';
const fixture = (overrides: Partial<SalaryInput> = {}): SalaryInput => ({
  year: 2026,
  month: 10,
  hourlyWage: 100,
  hours: { '100': 150, '125': 0, '150': 0, '200': 0 },
  creditPoints: 2.25,
  travel: 0,
  extra: 0,
  pension: { enabled: true, percent: 6, base: null },
  studyFund: { enabled: false, percent: 2.5, base: null },
  ...overrides,
});
describe('salary and deductions', () => {
  it('calculates a full monthly employee estimate with independently calculated values', () => {
    const result = calculateSalary(fixture());
    expect(result.gross).toBe(15000);
    expect(result.taxBeforeCredits).toBeCloseTo(2116);
    expect(result.pensionCredit).toBeCloseTo(237.65);
    expect(result.incomeTax).toBe(1333.85);
    expect(result.nationalInsurance).toBe(590.9);
    expect(result.healthInsurance).toBe(626.06);
    expect(result.pensionDeduction).toBe(900);
    expect(result.net).toBe(11549.19);
  });
  it('weights fractional hours and taxable additions without including them in the default base', () => {
    const r = calculateSalary(
      fixture({ hourlyWage: 50, hours: { '100': 160.5, '125': 10.5, '150': 8, '200': 4 }, travel: 300, extra: 200 }),
    );
    expect(r.hoursWage).toBe(9681.25);
    expect(r.gross).toBe(10181.25);
    expect(r.totalHours).toBe(183);
    expect(r.pensionBase).toBe(8025);
    expect(r.pensionDeduction).toBe(481.5);
  });
  it('supports separate manual bases and percentages', () => {
    const r = calculateSalary(
      fixture({
        pension: { enabled: true, percent: 7, base: 12000 },
        studyFund: { enabled: true, percent: 2.5, base: 10000 },
      }),
    );
    expect(r.pensionDeduction).toBe(840);
    expect(r.studyFundDeduction).toBe(250);
    expect(r.pensionCredit).toBeCloseTo(237.65);
  });
  it('disables contributions and their associated credit', () => {
    const r = calculateSalary(fixture({ pension: { enabled: false, percent: 6, base: null } }));
    expect(r.pensionDeduction).toBe(0);
    expect(r.pensionCredit).toBe(0);
    expect(r.incomeTax).toBe(1571.5);
  });
  it('keeps income tax and net unknown until credit points are supplied', () => {
    const r = calculateSalary(fixture({ creditPoints: null }));
    expect(r.incomeTax).toBeNull();
    expect(r.net).toBeNull();
    expect(r.totalDeductions).toBeNull();
    expect(r.pensionDeduction).toBe(900);
  });
  it('accepts zero credits and fractional credits, and floors tax at zero', () => {
    expect(calculateSalary(fixture({ creditPoints: 0 })).incomeTax).toBe(1878.35);
    expect(calculateSalary(fixture({ creditPoints: 2.75 })).incomeTax).toBe(1212.85);
    expect(calculateSalary(fixture({ creditPoints: 100 })).incomeTax).toBe(0);
  });
  it('does not credit more than the actual pension deposit or the eligible ceiling', () => {
    expect(calculateSalary(fixture({ pension: { enabled: true, percent: 1, base: 5000 } })).pensionCredit).toBeCloseTo(
      17.5,
    );
    expect(
      calculateSalary(fixture({ pension: { enabled: true, percent: 10, base: 15000 } })).pensionCredit,
    ).toBeCloseTo(237.65);
  });
  it('uses the statutory minimum eligible deposit for low insured salaries, limited to actual payment', () => {
    const r = calculateSalary(
      fixture({
        hourlyWage: 10,
        hours: { '100': 100, '125': 0, '150': 0, '200': 0 },
        pension: { enabled: true, percent: 20, base: null },
      }),
    );
    expect(r.pensionCredit).toBeCloseTo(189 * 0.35);
  });
  it('handles zero income', () => {
    const r = calculateSalary(fixture({ hourlyWage: 0 }));
    expect(r.net).toBe(0);
    expect(r.totalDeductions).toBe(0);
  });
  it('reconciles visible deductions to visible net across fractional inputs', () => {
    for (let n = 1; n <= 100; n++) {
      const r = calculateSalary(
        fixture({
          hourlyWage: 35.4 + n / 13,
          hours: { '100': 155.37, '125': 12.19, '150': 4.03, '200': 2.87 },
          travel: 233.33,
          studyFund: { enabled: true, percent: 2.5, base: null },
        }),
      );
      const total = roundMoney(
        r.incomeTax! + r.nationalInsurance + r.healthInsurance + r.pensionDeduction + r.studyFundDeduction,
      );
      expect(r.totalDeductions).toBe(total);
      expect(r.net).toBe(roundMoney(r.gross - total));
    }
  });
});
describe('tax table boundaries', () => {
  it.each([
    [7010, 701, 0.14],
    [10060, 1128, 0.2],
    [19000, 2916, 0.31],
    [25100, 4807, 0.35],
    [46690, 12363.5, 0.47],
    [60130, 18680.3, 0.5],
  ])('applies marginal rates at %s', (gross, expected, nextRate) => {
    const input = fixture({
      hourlyWage: gross,
      hours: { '100': 1, '125': 0, '150': 0, '200': 0 },
      creditPoints: 0,
      pension: { enabled: false, percent: 6, base: null },
    });
    expect(calculateSalary(input).incomeTax).toBe(expected);
    expect(calculateSalary({ ...input, hourlyWage: gross + 100 }).incomeTax! - expected).toBeCloseTo(nextRate * 100);
  });
  it('matches the official bracket-based no-pension reference: 20,000 gross, 2.25 points', () => {
    const r = calculateSalary(
      fixture({
        hourlyWage: 20000,
        hours: { '100': 1, '125': 0, '150': 0, '200': 0 },
        pension: { enabled: false, percent: 6, base: null },
      }),
    );
    expect(r.incomeTax).toBe(2681.5);
    // Live official simulator check on 2026-10-03 returns 2682 (whole-shekel rounding).
    expect(Math.round(r.incomeTax!)).toBe(2682);
  });
  it('uses retroactive expanded tax brackets for every 2026 month', () => {
    for (let month = 1; month <= 12; month++) expect(calculateSalary(fixture({ month })).incomeTax).toBe(1333.85);
  });
  it('caps both insurance deductions and applies the reduced boundary', () => {
    const input = fixture({ hourlyWage: 7703, hours: { '100': 1, '125': 0, '150': 0, '200': 0 } });
    const r = calculateSalary(input);
    expect(r.nationalInsurance).toBe(80.11);
    expect(r.healthInsurance).toBe(248.81);
    const higher = calculateSalary({ ...input, hourlyWage: 7803 });
    expect(higher.nationalInsurance - r.nationalInsurance).toBeCloseTo(7);
    expect(higher.healthInsurance - r.healthInsurance).toBeCloseTo(5.17);
    const capped = calculateSalary({ ...input, hourlyWage: 51910 });
    const over = calculateSalary({ ...input, hourlyWage: 80000 });
    expect(over.nationalInsurance).toBe(capped.nationalInsurance);
    expect(over.healthInsurance).toBe(capped.healthInsurance);
  });
  it('rejects invalid engine inputs instead of returning a misleading net', () => {
    expect(() => calculateSalary(fixture({ hourlyWage: -1 }))).toThrow();
    expect(() => calculateSalary(fixture({ creditPoints: NaN }))).toThrow();
    expect(() => calculateSalary(fixture({ pension: { enabled: true, percent: 101, base: null } }))).toThrow();
    expect(() => calculateSalary(fixture({ pension: { enabled: true, percent: 6, base: 20000 } }))).toThrow();
    expect(() =>
      calculateSalary(
        fixture({
          pension: { enabled: true, percent: 100, base: null },
          studyFund: { enabled: true, percent: 2.5, base: null },
        }),
      ),
    ).toThrow();
    expect(() => taxPeriod(2025, 1)).toThrow();
    expect(() => taxPeriod(2026, 13)).toThrow();
  });
});

describe('payslip hour categories', () => {
  it('calculates every photographed category separately and includes the three 100% columns in the default base', () => {
    const result = calculateSalary(
      fixture({
        hourlyWage: 50,
        hours: {
          absence: 2,
          saturdayAccount: 3,
          '100': 10,
          '125': 4,
          '150': 5,
          saturday150: 6,
          '200': 7,
          night150: 8,
          '187': 9,
          '225': 10,
        },
      }),
    );
    expect(result.gross).toBe(5093.75);
    expect(result.totalHours).toBe(64);
    expect(result.regularBase).toBe(750);
    expect(result.pensionDeduction).toBe(45);
    expect(result.wages.saturday150).toBe(450);
    expect(result.wages.night150).toBe(600);
    expect(result.wages['187']).toBe(843.75);
    expect(result.wages['225']).toBe(1125);
  });
});

it('applies fixed employee and employer rates to separate bases, including travel and recovery', () => {
  const r = calculateSalary(
    fixture({
      fixedProfile: true,
      travel: 323,
      saturdayTrips: 6,
      otherExpenses: 172.7,
      recovery: 292.36,
      shift20Hours: 10,
      shift50Hours: 6,
    }),
  );
  expect(r.expenses).toBeCloseTo(633.7);
  expect(r.overtimeWage).toBe(500);
  expect(r.regularReduction).toBe(180);
  expect(r.overtimeReduction).toBe(6);
  expect(r.gross).toBe(16240.06);
  expect(r.pensionDeduction).toBe(1137.16);
  expect(r.studyFundBase).toBeCloseTo(15112.36);
  expect(r.studyFundDeduction).toBe(377.81);
  expect(r.employerPension).toBe(1216.12);
  expect(r.employerSeverance).toBe(947.54);
  expect(r.employerStudyFund).toBe(1133.43);
  expect(r.net).toBe(roundMoney(r.gross - r.totalDeductions!));
});
it('applies employee and employer contributions to independent sample bases', () => {
  const r = calculateSalary(fixture({
    fixedProfile: true, hourlyWage: 100,
    hours: { '100': 60, '125': 32, '150': 0, '200': 0 },
    travel: 500, recovery: 300,
  }));
  expect(r.pensionBase).toBe(6300);
  expect(r.studyFundBase).toBe(6228);
  expect(r.pensionDeduction).toBe(746);
  expect(r.studyFundDeduction).toBe(155.7);
  expect(r.employerPension).toBe(797.5);
  expect(r.employerSeverance).toBe(618);
  expect(r.employerStudyFund).toBe(467.1);
});

it('rounds payroll hourly rates at half cents before multiplying hours', () => {
  expect(roundMoney(44.13 * 1.5)).toBe(66.2);
  expect(roundMoney(44.13 * 0.5)).toBe(22.07);
});

it('taxes noncash benefits without paying them or contributing to savings on them', () => {
  const base = calculateSalary(fixture());
  const r = calculateSalary(fixture({ taxableBenefits: 1000 }));
  expect(r.gross).toBe(base.gross);
  expect(r.pensionDeduction).toBe(base.pensionDeduction);
  expect(r.studyFundDeduction).toBe(base.studyFundDeduction);
  expect(r.taxableIncome).toBe(16000);
  expect(r.incomeTax! - base.incomeTax!).toBe(200);
  expect(r.nationalInsurance - base.nationalInsurance).toBe(70);
  expect(r.healthInsurance - base.healthInsurance).toBeCloseTo(51.7);
  expect(r.net! - base.net!).toBeCloseTo(-321.7);
});

it('includes separately assessed arrears only in cash reconciliation', () => {
  const base = calculateSalary(fixture());
  const r = calculateSalary(fixture({ arrearsPayments: 2000, arrearsDeductions: 250 }));
  expect(r.gross).toBe(base.gross);
  expect(r.taxableIncome).toBe(base.taxableIncome);
  expect(r.incomeTax).toBe(base.incomeTax);
  expect(r.net! - base.net!).toBeCloseTo(1750);
  expect(r.net).toBe(roundMoney(r.cashGross - r.totalDeductions!));
});

it('calculates accumulated liability, subtracts tax already withheld, and permits a refund', () => {
  const cumulative = { taxableIncome: 120000, pensionCredit: 0, taxPaidBeforeMonth: 10000 };
  const r = calculateSalary(fixture({ month: 6, cumulativeTax: cumulative }));
  // Six months at 20,000: 6 × (3,226 tax before credits - 544.50 point credits).
  expect(r.incomeTax).toBe(6089);
  expect(calculateSalary(fixture({ month: 6, cumulativeTax: { ...cumulative, taxPaidBeforeMonth: 17000 } })).incomeTax).toBe(-911);
  expect(() => calculateSalary(fixture({ taxableBenefits: -1 }))).toThrow();
  expect(() => calculateSalary(fixture({ cumulativeTax: { ...cumulative, pensionCredit: NaN } }))).toThrow();
});
