import BigNumber from "bignumber.js"

export const RATE_ONE = BigInt(1E12)
//TODO: Enhace math precision here (use second rate from backend)
export const MINUTES_PER_YEAR = 60 * 24 * 365

export type BigIntRate = bigint
export function convertFromYearToPeriodInterestRate(normalizedYearRate: number, periodsInYear: number ) : BigIntRate {
  const normalizedPeriodRate = (1 + normalizedYearRate) ** (1/periodsInYear) - 1.0
  const scaledRate = BigNumber(normalizedPeriodRate).multipliedBy(RATE_ONE.toString())
  return BigInt(scaledRate.integerValue(BigNumber.ROUND_DOWN).toString())
}

export function convertToYearFromPeriodInterestRate(normalizedYearRate: number, periodsInYear: number ) : BigIntRate {
  const normalizedPeriodRate = (1 + normalizedYearRate) ** (periodsInYear) - 1.0
  const scaledRate = BigNumber(normalizedPeriodRate).multipliedBy(RATE_ONE.toString())
  return BigInt(scaledRate.integerValue(BigNumber.ROUND_DOWN).toString())
}
