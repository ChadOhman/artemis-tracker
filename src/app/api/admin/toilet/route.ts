// src/app/api/admin/toilet/route.ts
// Simple API to get/set toilet status without rebuilding.
// Protected by a secret token in the query string.

export const dynamic = "force-dynamic";

let toiletStatus: "GO" | "INOP" = "GO";

export async function GET(): Promise<Response> {
  return Response.json({ status: toiletStatus });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (body.status === "GO" || body.status === "INOP") {
    toiletStatus = body.status;
    return Response.json({ status: toiletStatus });
  }
  return Response.json({ error: "Invalid status. Use GO or INOP." }, { status: 400 });
}

/** Read current status — used by TopBar via SSE or polling */
export function getToiletStatus(): "GO" | "INOP" {
  return toiletStatus;
}
