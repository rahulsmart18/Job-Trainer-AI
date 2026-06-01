export const OFFER_DURATION_MS = 15 * 60 * 1000;

/** Demo/dev: spinner always lands on 80%. Swap for real payment provider in production. */
export const SPIN_JACKPOT_DISCOUNT = 80;

export function resolveSpinDiscount(): number {
  return SPIN_JACKPOT_DISCOUNT;
}
