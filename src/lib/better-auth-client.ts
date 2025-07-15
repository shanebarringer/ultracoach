import { createAuthClient } from "better-auth/client";
import type { Session, User } from "@/lib/better-auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

export type { Session, User };