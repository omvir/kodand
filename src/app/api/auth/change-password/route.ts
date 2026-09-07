import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, updateUserPassword } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  try {
    const token =
      req.cookies.get("kodand_session")?.value ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await updateUserPassword(payload.sub, currentPassword, newPassword);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update password." }, { status: 400 });
  }
}
