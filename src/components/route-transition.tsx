"use client";

import { usePathname } from "next/navigation";

/** Re-mounts children on route change to play a quick fade-up transition. */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="fade-up">
      {children}
    </div>
  );
}
