import { betterAuth } from "better-auth";
import { admin, multiSession } from "better-auth/plugins";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "kodand_secret_jwt_cf_d1_2026_auth_sentinel",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      tier: {
        type: "string",
        defaultValue: "free",
        input: false,
      },
      company: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      scansUsed: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      maxScans: {
        type: "number",
        defaultValue: 10,
        input: false,
      },
      lastActiveIp: {
        type: "string",
        required: false,
        input: false,
      },
      lastActiveCity: {
        type: "string",
        required: false,
        input: false,
      },
      lastActiveCountry: {
        type: "string",
        required: false,
        input: false,
      },
      lastActiveDevice: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    multiSession({
      maximumSessions: 10,
    }),
  ],
});
