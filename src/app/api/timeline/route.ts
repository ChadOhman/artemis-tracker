// src/app/api/timeline/route.ts
import { NextResponse } from "next/server";
import { getTimelineData } from "@/lib/timeline/data";

export async function GET(): Promise<NextResponse> {
  const data = getTimelineData();
  return NextResponse.json(data);
}
