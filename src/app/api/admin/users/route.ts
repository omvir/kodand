import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  getUserById,
  updateUserTier,
  updateUserStatus,
  verifySessionToken,
} from "@/lib/auth-store";

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

  const userId = req.nextUrl.searchParams.get("userId");
  if (userId) {
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, user });
  }

  const users = getAllUsers();
  const totalDevicesTracked = users.reduce((acc, u) => acc + (u.devices?.length || 0), 0);
  const totalUserScans = users.reduce((acc, u) => acc + (u.scansUsed || 0), 0);

  return NextResponse.json({
    success: true,
    total: users.length,
    totalDevicesTracked,
    totalUserScans,
    users,
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, tier, status } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    let updatedUser;
    if (tier) {
      updatedUser = updateUserTier(userId, tier);
    }
    if (status) {
      updatedUser = updateUserStatus(userId, status);
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
