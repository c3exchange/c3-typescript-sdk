import "mocha"
import { convertFromYearToPeriodInterestRate, convertToYearFromPeriodInterestRate, RATE_ONE } from "../src/index"
import { expect } from 'chai'

describe('Rate', () => {

  const TenPercentRate = RATE_ONE / 10n
  const AnnualizedTenPercentRate = 2138428376721n
  const AnnualizedTenPercent = 2.138428376721
  const TenPercentMonthly = 0.1
  it('convertFromYearToPeriodInterestRate should preserve zero',()=>{
    const rate = convertFromYearToPeriodInterestRate(0.0, 365*24*60)
    expect(rate).eq(0n)
  })

  it('Should convert 10% Annualized -> Monthly',()=>{
    const rate = convertFromYearToPeriodInterestRate(AnnualizedTenPercent, 12)
    expect(rate.toString()).eq(TenPercentRate.toString())
  })

  it('Should convert 10% Monthly -> Annualized',()=>{
    const rate = convertToYearFromPeriodInterestRate(TenPercentMonthly, 12)
    expect(rate.toString()).eq(AnnualizedTenPercentRate.toString())
  })

})