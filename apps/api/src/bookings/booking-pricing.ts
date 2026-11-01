const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function calculateDueIdr(totalPriceIdr: number, departureAt: Date, createdAt: Date, downPaymentPercent: number): number {
  if (!Number.isSafeInteger(totalPriceIdr) || totalPriceIdr < 0 || !Number.isInteger(downPaymentPercent) || downPaymentPercent < 1 || downPaymentPercent > 100) {
    throw new RangeError('Invalid booking amount or down-payment percentage.');
  }
  if (departureAt.getTime() - createdAt.getTime() < SEVEN_DAYS_MS) return totalPriceIdr;
  return Math.ceil(totalPriceIdr * downPaymentPercent / 100);
}
