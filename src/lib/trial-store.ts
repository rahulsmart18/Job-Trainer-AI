import { isMissingColumnError } from "@/lib/checkout-store";

export type TrialRecord = {
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  autoPayEnabled: boolean;
  trialCancelledAt: string | null;
};

const globalTrial = globalThis as unknown as {
  trialByUser?: Map<string, TrialRecord>;
};

function memory(): Map<string, TrialRecord> {
  if (!globalTrial.trialByUser) globalTrial.trialByUser = new Map();
  return globalTrial.trialByUser;
}

export function getMemoryTrial(userId: string): TrialRecord | undefined {
  return memory().get(userId);
}

export function setMemoryTrial(userId: string, record: TrialRecord): void {
  memory().set(userId, record);
}

export function clearMemoryTrial(userId: string): void {
  memory().delete(userId);
}

export { isMissingColumnError };
