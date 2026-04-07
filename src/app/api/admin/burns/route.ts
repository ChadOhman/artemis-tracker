// src/app/api/admin/burns/route.ts
// Update burn statuses at runtime without rebuilding.

export const dynamic = "force-dynamic";

interface BurnOverride {
  name: string;
  status: "executed" | "cancelled" | "planned";
  dv?: number;
}

const burnOverrides: BurnOverride[] = [];

export function getBurnOverrides(): BurnOverride[] {
  return burnOverrides;
}

export async function GET(): Promise<Response> {
  return Response.json({ overrides: burnOverrides });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.name || !body.status) {
    return Response.json({ error: "Required: name, status" }, { status: 400 });
  }

  const validStatuses = ["executed", "cancelled", "planned"];
  if (!validStatuses.includes(body.status)) {
    return Response.json({ error: `Invalid status. Use: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const override: BurnOverride = {
    name: body.name,
    status: body.status,
    dv: body.dv != null ? parseFloat(body.dv) : undefined,
  };

  const idx = burnOverrides.findIndex((b) => b.name === override.name);
  if (idx >= 0) burnOverrides[idx] = override;
  else burnOverrides.push(override);

  return Response.json({ success: true, overrides: burnOverrides });
}
