// src/app/api/admin/toilet/route.ts
// Dynamic toilet status — toggleable from /admin without rebuilding.

export const dynamic = "force-dynamic";

let toiletStatus: "GO" | "INOP" = "GO";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // If token is provided, validate it (used by /admin login check)
  if (token != null) {
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return Response.json({ status: toiletStatus });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  if (body.status === "GO" || body.status === "INOP") {
    toiletStatus = body.status;
    return Response.json({ status: toiletStatus });
  }
  return Response.json({ error: "Invalid status. Use GO or INOP." }, { status: 400 });
}
