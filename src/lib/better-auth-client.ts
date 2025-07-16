import { createAuthClient } from "better-auth/client";
import type { Session, User } from "@/lib/better-auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger('better-auth-client');

export const authClient = createAuthClient({
  baseURL: (process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000") + "/api/auth",
  fetchOptions: {
    onError(context) {
      logger.error("Better Auth client error:", {
        error: context.error,
        response: context.response,
        status: context.response?.status,
        url: context.request?.url
      });
    },
    onSuccess(context) {
      logger.debug("Better Auth client success:", {
        url: context.request?.url,
        status: context.response?.status
      });
    },
  },
});

export type { Session, User };