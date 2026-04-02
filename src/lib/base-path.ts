// src/lib/base-path.ts
// Returns the Next.js basePath for use in client-side fetch/EventSource calls.
// Next.js auto-prepends basePath for <Link> and router, but NOT for fetch().

export function getBasePath(): string {
  if (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.basePath) {
    return (window as any).__NEXT_DATA__.basePath;
  }
  // Fallback: read from env at build time
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
