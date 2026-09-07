import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "edge";

export const { GET, POST } = toNextJsHandler(auth);
