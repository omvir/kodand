import { NextRequest, NextResponse } from "next/server";
import { registerUser, authenticateUser, createSessionToken } from "@/lib/auth-store";
import { parseEdgeClientInfo } from "@/lib/device-telemetry";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  // If real Google Client ID is configured in .env, redirect to Google Accounts
  if (clientId && clientId !== "your_google_client_id_here") {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    return NextResponse.redirect(googleAuthUrl);
  }

  // Safe developer demo fallback: sign in as verified Google user
  const edgeInfo = parseEdgeClientInfo(req.headers);
  const demoGoogleEmail = "google.user@example.com";
  const demoGoogleName = "Google Verified User";

  let user;
  try {
    user = await authenticateUser(demoGoogleEmail, "google_oauth_pass_2026", edgeInfo);
  } catch {
    user = await registerUser({
      name: demoGoogleName,
      email: demoGoogleEmail,
      password: "google_oauth_pass_2026",
      company: "Google Workspace",
      tier: "starter",
      telemetry: edgeInfo,
    });
  }

  const token = createSessionToken(user);
  const response = NextResponse.redirect(new URL("/account", req.url));

  response.cookies.set("kodand_session", token, {
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return response;
}
