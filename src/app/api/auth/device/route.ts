import { NextRequest, NextResponse } from "next/server";
import { recordUserDevice, verifySessionToken, getUserById } from "@/lib/auth-store";
import { parseEdgeClientInfo } from "@/lib/device-telemetry";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const tokenFromHeader = authHeader.replace(/^Bearer\s+/i, "").trim();
    const tokenFromCookie = req.cookies.get("kodand_session")?.value?.trim();
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const edgeInfo = parseEdgeClientInfo(req.headers);
    const clientSpecs = body.deviceSpecs || body || {};

    const telemetry = {
      ...edgeInfo,
      ...clientSpecs,
      ip: edgeInfo.ip || clientSpecs.ip,
      country: edgeInfo.country || clientSpecs.country,
      city: edgeInfo.city || clientSpecs.city,
    };

    const device = recordUserDevice(payload.sub, telemetry, payload);
    const user = getUserById(payload.sub, payload);

    return NextResponse.json({
      success: true,
      device,
      totalDevices: user?.devices?.length || 1,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
