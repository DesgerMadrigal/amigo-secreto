// src/app/api/admin/events/[id]/pairing/unlock/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role;
  if (!uid || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const eventId = Number(params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ev] = await conn.query(
      "SELECT id, owner_user_id, status FROM events WHERE id=? LIMIT 1",
      [eventId]
    );
    if (!ev) { await conn.rollback(); return NextResponse.json({ error: "Event not found" }, { status: 404 }); }
    if (ev.owner_user_id !== uid) { await conn.rollback(); return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

    // borrar pares y volver a draft
    await conn.query("DELETE FROM pairs WHERE event_id=?", [eventId]);
    await conn.query("UPDATE events SET status='draft' WHERE id=?", [eventId]);

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    try { await conn.rollback(); } catch {}
    return NextResponse.json({ error: "Error al desbloquear" }, { status: 500 });
  } finally { conn.release(); }
}
