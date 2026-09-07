import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, verifySessionToken } from "@/lib/auth-store";

function checkAdminAuth(req: NextRequest): boolean {
  const pin = req.nextUrl.searchParams.get("pin") || req.headers.get("x-admin-pin");
  if (pin === (process.env.ADMIN_PIN || "kodand2026")) return true;

  const token =
    req.cookies.get("kodand_session")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    const payload = verifySessionToken(token);
    if (payload?.role === "admin") return true;
  }

  return false;
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") || "csv";
  const type = req.nextUrl.searchParams.get("type") || "all";
  const users = getAllUsers();

  if (format === "json") {
    return new NextResponse(JSON.stringify({ success: true, exportedAt: new Date().toISOString(), totalUsers: users.length, users }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kodand-users-export-${Date.now()}.json"`,
      },
    });
  }

  // Generate CSV based on type
  if (type === "devices") {
    const headers = [
      "Device ID",
      "User Email",
      "User Name",
      "Device Name",
      "Device Type",
      "Browser",
      "Operating System",
      "Platform",
      "Screen Resolution",
      "Color Depth",
      "Touch Support",
      "Language",
      "Time Zone",
      "CPU Cores",
      "RAM",
      "Connection",
      "IP Address",
      "City",
      "Country",
      "First Seen",
      "Last Seen",
      "Login Count",
      "User Agent",
    ];

    const rows: string[] = [headers.join(",")];

    for (const u of users) {
      for (const d of u.devices || []) {
        rows.push(
          [
            escapeCsvField(d.id),
            escapeCsvField(u.email),
            escapeCsvField(u.name),
            escapeCsvField(d.deviceName),
            escapeCsvField(d.deviceType),
            escapeCsvField(d.browser),
            escapeCsvField(d.os),
            escapeCsvField(d.platform),
            escapeCsvField(d.screenResolution),
            escapeCsvField(d.colorDepth || "N/A"),
            escapeCsvField(d.touchSupport ? "Yes" : "No"),
            escapeCsvField(d.language),
            escapeCsvField(d.timeZone),
            escapeCsvField(d.hardwareConcurrency || "N/A"),
            escapeCsvField(d.deviceMemory || "N/A"),
            escapeCsvField(d.connectionType || "N/A"),
            escapeCsvField(d.ip),
            escapeCsvField(d.city),
            escapeCsvField(d.country),
            escapeCsvField(d.firstSeenAt),
            escapeCsvField(d.lastSeenAt),
            escapeCsvField(d.loginCount),
            escapeCsvField(d.userAgent),
          ].join(",")
        );
      }
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kodand-devices-export-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "scans") {
    const headers = [
      "Scan ID",
      "User Email",
      "User Name",
      "Target URL",
      "Health Score",
      "Mode",
      "Grade",
      "Issues Count",
      "Device Used",
      "IP Address",
      "Location",
      "Timestamp",
    ];

    const rows: string[] = [headers.join(",")];

    for (const u of users) {
      for (const s of u.scansHistory || []) {
        rows.push(
          [
            escapeCsvField(s.id),
            escapeCsvField(u.email),
            escapeCsvField(u.name),
            escapeCsvField(s.url),
            escapeCsvField(s.score),
            escapeCsvField(s.mode),
            escapeCsvField(s.grade),
            escapeCsvField(s.issuesCount ?? 0),
            escapeCsvField(s.device || "Unknown"),
            escapeCsvField(s.ip || "N/A"),
            escapeCsvField(`${s.city || ""}, ${s.country || ""}`.trim()),
            escapeCsvField(s.timestamp),
          ].join(",")
        );
      }
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kodand-user-scans-export-${Date.now()}.csv"`,
      },
    });
  }

  // Default: All Users summary CSV
  const userHeaders = [
    "User ID",
    "Full Name",
    "Email Address",
    "Role",
    "Subscription Tier",
    "Status",
    "Company",
    "Phone",
    "Total Devices",
    "Scans Used",
    "Max Scans",
    "Login Count",
    "Registered At",
    "Last Login At",
    "Last Active Device",
    "Last Active IP",
    "Last Active City",
    "Last Active Country",
  ];

  const userRows: string[] = [userHeaders.join(",")];

  for (const u of users) {
    userRows.push(
      [
        escapeCsvField(u.id),
        escapeCsvField(u.name),
        escapeCsvField(u.email),
        escapeCsvField(u.role),
        escapeCsvField(u.tier),
        escapeCsvField(u.status),
        escapeCsvField(u.company || "N/A"),
        escapeCsvField(u.phone || "N/A"),
        escapeCsvField(u.devices?.length || 0),
        escapeCsvField(u.scansUsed),
        escapeCsvField(u.maxScans),
        escapeCsvField(u.loginCount),
        escapeCsvField(u.createdAt),
        escapeCsvField(u.lastLoginAt),
        escapeCsvField(u.lastActiveDevice || "N/A"),
        escapeCsvField(u.lastActiveIp || "N/A"),
        escapeCsvField(u.lastActiveCity || "N/A"),
        escapeCsvField(u.lastActiveCountry || "N/A"),
      ].join(",")
    );
  }

  return new NextResponse(userRows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kodand-users-export-${Date.now()}.csv"`,
    },
  });
}
