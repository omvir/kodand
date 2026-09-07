import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, getUserById } from "@/lib/auth-store";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
  const tokenFromCookie = req.cookies.get("kodand_session")?.value?.trim();
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = getUserById(payload.sub, payload);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 404 });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
