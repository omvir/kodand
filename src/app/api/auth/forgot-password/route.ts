import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth-store";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const token = createPasswordResetToken(email);
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const resetUrl = `${proto}://${host}/reset-password?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      success: true,
      message: "Password reset link generated successfully.",
      resetToken: token,
      resetUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate reset link." }, { status: 400 });
  }
}
