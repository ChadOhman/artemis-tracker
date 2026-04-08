// src/app/api/subscribe/route.ts
// Public email signup endpoint with basic rate limiting.

import { addSubscriber } from "@/lib/db";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiting: 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const atIndex = email.indexOf("@");
  if (atIndex < 1) return false;
  const afterAt = email.slice(atIndex + 1);
  return afterAt.includes(".") && afterAt.length >= 3;
}

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body?.email?.trim()?.toLowerCase();
  if (!isValidEmail(email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const isNew = addSubscriber(email);
    return Response.json({ ok: true }, { status: isNew ? 201 : 200 });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
