import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set("kodand_session", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
