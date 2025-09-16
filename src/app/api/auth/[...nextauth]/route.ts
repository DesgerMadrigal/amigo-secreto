// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";
const handler = NextAuth(authConfig);
export { handler as GET, handler as POST };
