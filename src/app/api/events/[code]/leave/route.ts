// src/app/api/events/[code]/leave/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

export async function POST(_: NextRequest, { params }: { params: { code: string } }) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(`SELECT id, status FROM events WHERE code=? LIMIT 1`, [params.code]);
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (ev.status === "locked") {
      return NextResponse.json({ error: "Este evento ya está sellado. No puedes salir." }, { status: 409 });
    }

    const res = await conn.query(
      `DELETE FROM participants WHERE user_id=? AND event_id=? LIMIT 1`,
      [uid, ev.id]
    );

    if (res.affectedRows === 0) {
      return NextResponse.json({ error: "No estabas unido a este evento" }, { status: 400 });
    }

    // También podrías limpiar un posible par si estuviera generado (opcional)
    await conn.query(
      `DELETE pr FROM pairs pr
       JOIN participants p ON p.id = pr.giver_participant_id OR p.id = pr.receiver_participant_id
       WHERE pr.event_id=? AND p.user_id=?`,
      [ev.id, uid]
    ).catch(() => { /* ignora si no aplica */ });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Leave failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
