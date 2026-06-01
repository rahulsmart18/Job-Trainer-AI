import { planById } from "@/lib/features";

/** Full-access trial length in days. */
export const TRIAL_DAYS = 7;

/** ₹1 mandate verification (100 paise). Refunded in production via payment provider. */
export const TRIAL_MANDATE_PAISE = 100;

export const TRIAL_MANDATE_INR = TRIAL_MANDATE_PAISE / 100;

/** Monthly full bundle price after trial (no spin / no hidden discount). */
export const TRIAL_FULL_PRICE_INR = planById("full_bundle").basePrice;

export function trialEndDate(from = new Date()): string {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end.toISOString();
}

export function formatTrialEnd(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(iso));
}
