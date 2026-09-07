import { NextRequest, NextResponse } from "next/server";
import { registerUser, createSessionToken } from "@/lib/auth-store";
import { parseEdgeClientInfo } from "@/lib/device-telemetry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Merge client-sent specs with Cloudflare Edge headers
    const edgeInfo = parseEdgeClientInfo(req.headers);
    const clientSpecs = body.deviceSpecs || {};
    const telemetry = {
      ...edgeInfo,
      ...clientSpecs,
      ip: edgeInfo.ip || clientSpecs.ip,
      country: edgeInfo.country || clientSpecs.country,
      city: edgeInfo.city || clientSpecs.city,
    };

    const user = await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
      company: body.company,
      phone: body.phone,
      tier: body.tier || "free",
      telemetry,
    });

    const token = createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user,
      token,
    });

    response.cookies.set("kodand_session", token, {
      path: "/",
      httpOnly: false, // Accessible client-side for fast hydration
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
