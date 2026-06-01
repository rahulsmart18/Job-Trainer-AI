"use client";

import { useCallback, useEffect, useState } from "react";
import type { JourneyModuleId } from "@/lib/user-journey";

const STORAGE_PREFIX = "job-trainer-journey-";

export type JourneyProgress = Partial<Record<JourneyModuleId, boolean>>;

export function useJourneyProgress(userId: string) {
  const key = `${STORAGE_PREFIX}${userId || "anon"}`;

  const [progress, setProgress] = useState<JourneyProgress>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setProgress(JSON.parse(raw) as JourneyProgress);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key]);

  const markComplete = useCallback(
    (id: JourneyModuleId) => {
      setProgress((prev) => {
        const next = { ...prev, [id]: true };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );

  const completedCount = Object.values(progress).filter(Boolean).length;

  return { progress, markComplete, completedCount, loaded };
}

export function firstIncompleteStep(
  stepIds: JourneyModuleId[],
  progress: JourneyProgress,
): JourneyModuleId {
  for (const id of stepIds) {
    if (!progress[id]) return id;
  }
  return stepIds[stepIds.length - 1] ?? "twin";
}
