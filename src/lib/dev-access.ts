/** Dev-only bypass for pages blocked after onboarding / full purchase (use ?dev=1). */
export function isDevBypass(params: { dev?: string | null | undefined }): boolean {
  return process.env.NODE_ENV === "development" && params.dev === "1";
}

export function devModeFromRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return new URL(request.url).searchParams.get("dev") === "1";
}

export function withDevQuery(path: string, devMode: boolean): string {
  if (!devMode) return path;
  return path.includes("?") ? `${path}&dev=1` : `${path}?dev=1`;
}
