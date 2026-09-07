import { NextRequest, NextResponse } from "next/server";
import { verifyAndResetPassword } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await verifyAndResetPassword(token, newPassword);

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset. You may now log in.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset password." }, { status: 400 });
  }
}
