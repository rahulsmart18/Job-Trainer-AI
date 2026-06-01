import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CheckoutOffer = {
  discountPercent: number;
  offerExpiresAt: string | null;
};

const globalForOffers = globalThis as unknown as {
  checkoutOffers?: Map<string, CheckoutOffer>;
};

function memoryStore(): Map<string, CheckoutOffer> {
  if (!globalForOffers.checkoutOffers) {
    globalForOffers.checkoutOffers = new Map();
  }
  return globalForOffers.checkoutOffers;
}

export function isMissingColumnError(message: string): boolean {
  return /column.*does not exist|schema cache/i.test(message);
}

export function setMemoryCheckoutOffer(userId: string, offer: CheckoutOffer): void {
  memoryStore().set(userId, offer);
}

export function getMemoryCheckoutOffer(userId: string): CheckoutOffer | undefined {
  return memoryStore().get(userId);
}

export async function getCheckoutOffer(userId: string): Promise<CheckoutOffer> {
  const cached = getMemoryCheckoutOffer(userId);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return cached ?? { discountPercent: 0, offerExpiresAt: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("discount_percent, offer_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error.message)) {
      return cached ?? { discountPercent: 0, offerExpiresAt: null };
    }
    return cached ?? { discountPercent: 0, offerExpiresAt: null };
  }

  const fromDb: CheckoutOffer = {
    discountPercent: data?.discount_percent ?? 0,
    offerExpiresAt: data?.offer_expires_at ?? null,
  };

  if (fromDb.discountPercent > 0) return fromDb;
  return cached ?? fromDb;
}

export async function saveCheckoutOffer(
  userId: string,
  discountPercent: number,
  offerExpiresAt: string,
): Promise<{ ok: boolean; error?: string }> {
  const offer: CheckoutOffer = { discountPercent, offerExpiresAt };
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    setMemoryCheckoutOffer(userId, offer);
    return { ok: true };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      discount_percent: discountPercent,
      offer_expires_at: offerExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    if (isMissingColumnError(error.message)) {
      setMemoryCheckoutOffer(userId, offer);
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  setMemoryCheckoutOffer(userId, offer);
  return { ok: true };
}

export async function updateProfileRow(
  userId: string,
  payload: Record<string, unknown>,
  legacyPayload?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database is not configured." };

  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);

  if (error && legacyPayload && isMissingColumnError(error.message)) {
    const legacy = await supabase.from("profiles").update(legacyPayload).eq("user_id", userId);
    if (legacy.error) return { ok: false, error: legacy.error.message };
    return { ok: true };
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
