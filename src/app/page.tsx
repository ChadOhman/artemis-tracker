import { Dashboard } from "@/components/Dashboard";

// Shell HTML is identical for every user — all live data hydrates from SSE on
// the client. Regenerate every 60 s via ISR so Next emits a short s-maxage and
// Cloudflare can cache at the edge. Stale deploys self-heal via the auto-refresh
// hook in /api/build (which remains force-dynamic).
export const revalidate = 60;

export default function Home() {
  return <Dashboard />;
}
