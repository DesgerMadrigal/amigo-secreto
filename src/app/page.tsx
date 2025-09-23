// src/app/page.tsx
export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";

export default async function Home() {
  const session = await getServerSession(authConfig);

  // sin sesión → login
  if (!session?.user?.id) {
    redirect("/login");
  }

  // con sesión → dashboard (ahí decides admin vs usuario)
  redirect("/dashboard");
}
