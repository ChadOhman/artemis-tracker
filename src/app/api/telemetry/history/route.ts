// src/app/api/telemetry/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TelemetryCache } from "@/lib/telemetry/cache";

const cache = new TelemetryCache();
let loaded = false;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!loaded) {
    await cache.loadFromDisk();
    loaded = true;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing 'from' and 'to' query parameters (MET in ms)" },
      { status: 400 }
    );
  }

  const fromMs = parseInt(from, 10);
  const toMs = parseInt(to, 10);

  if (isNaN(fromMs) || isNaN(toMs)) {
    return NextResponse.json(
      { error: "'from' and 'to' must be valid integers (MET in ms)" },
      { status: 400 }
    );
  }

  const vectors = cache.getHistory(fromMs, toMs);
  return NextResponse.json({ vectors });
}
