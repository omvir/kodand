import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createSessionToken } from "@/lib/auth-store";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await authenticateUser(body.email, body.password);
    const token = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      token,
    });

    response.cookies.set("kodand_session", token, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
