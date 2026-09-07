import { NextRequest, NextResponse } from "next/server";
import { getTelemetryStats, recordScanTelemetry } from "@/lib/admin-telemetry";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pin = searchParams.get("pin") || req.headers.get("x-admin-pin");

  // Verify PIN (default: kodand2026 or from env)
  const validPin = process.env.ADMIN_PIN || "kodand2026";
  if (pin !== validPin) {
    return NextResponse.json(
      { error: "Unauthorized. Invalid Admin PIN." },
      { status: 401 }
    );
  }

  const stats = getTelemetryStats();
  return NextResponse.json({
    success: true,
    stats,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const country = req.headers.get("cf-ipcountry") || "IN";
    const event = recordScanTelemetry({
      url: body.url,
      mode: body.mode || "full",
      score: body.score || 80,
      grade: body.grade || "B",
      durationMs: body.durationMs || 500,
      country,
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
