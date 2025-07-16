import { createAuthClient } from "better-auth/client";
import type { Session, User } from "@/lib/better-auth";

export const authClient = createAuthClient({
  baseURL: (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000") + "/api/auth",
  fetchOptions: {
    onError(context) {
      console.error("Better Auth client error:", {
        error: context.error,
        response: context.response,
        status: context.response?.status,
        url: context.request?.url
      });
    },
    onSuccess(context) {
      console.log("Better Auth client success:", {
        url: context.request?.url,
        status: context.response?.status
      });
    },
  },
});

export type { Session, User };