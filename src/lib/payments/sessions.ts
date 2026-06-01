import type { CheckoutSession } from "./types";

const globalForSessions = globalThis as unknown as {
  checkoutSessions?: Map<string, CheckoutSession>;
};

function getSessionStore(): Map<string, CheckoutSession> {
  if (!globalForSessions.checkoutSessions) {
    globalForSessions.checkoutSessions = new Map();
  }
  return globalForSessions.checkoutSessions;
}

export function saveCheckoutSession(session: CheckoutSession): void {
  getSessionStore().set(session.sessionId, session);
}

export function getCheckoutSession(sessionId: string): CheckoutSession | undefined {
  return getSessionStore().get(sessionId);
}

export function deleteCheckoutSession(sessionId: string): void {
  getSessionStore().delete(sessionId);
}
