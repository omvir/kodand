import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, updateUserTier, verifySessionToken } from "@/lib/auth-store";

export const runtime = "edge";

function checkAdminAuth(req: NextRequest): boolean {
  // Check PIN
  const pin = req.nextUrl.searchParams.get("pin") || req.headers.get("x-admin-pin");
  if (pin === (process.env.ADMIN_PIN || "kodand2026")) return true;

  // Or check session token role
  const token =
    req.cookies.get("kodand_session")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    const payload = verifySessionToken(token);
    if (payload?.role === "admin") return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  const users = getAllUsers();
  return NextResponse.json({
    success: true,
    total: users.length,
    users,
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, tier } = body;
    if (!userId || !tier) {
      return NextResponse.json({ error: "userId and tier are required." }, { status: 400 });
    }

    const updatedUser = updateUserTier(userId, tier);
    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
