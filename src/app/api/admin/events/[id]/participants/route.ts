// src/app/api/admin/events/[id]/participants/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role as "admin" | "user" | undefined;
  if (!uid || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const eventId = Number(id);

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(
      "SELECT id, owner_user_id FROM events WHERE id=? LIMIT 1",
      [eventId]
    );
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (ev.owner_user_id !== uid)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const items = await conn.query(
      `SELECT
         COALESCE(NULLIF(p.alias,''), u.username) AS alias,
         p.created_at
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.event_id=?
       ORDER BY p.created_at ASC`,
      [eventId]
    );
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[participants] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
