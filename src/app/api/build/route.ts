// src/app/api/build/route.ts
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown" });
}
