// src/app/api/events/[code]/join/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import crypto from "crypto";

export async function POST(_: NextRequest, { params }: { params: { code: string } }) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(`SELECT id, status FROM events WHERE code=? LIMIT 1`, [params.code]);
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (ev.status === "locked") {
      return NextResponse.json({ error: "El evento ya está sellado. No es posible unirse." }, { status: 409 });
    }

    // ¿ya está en este evento?
    const [existsSame] = await conn.query(
      `SELECT id FROM participants WHERE user_id=? AND event_id=? LIMIT 1`,
      [uid, ev.id]
    );
    if (existsSame) return NextResponse.json({ ok: true, joined: true });

    // ¿ya está en ALGÚN otro evento?
    const [existsOther] = await conn.query(
      `SELECT p.id, e.code FROM participants p 
       JOIN events e ON e.id = p.event_id
       WHERE p.user_id=? AND p.event_id<>? LIMIT 1`,
      [uid, ev.id]
    );
    if (existsOther) {
      return NextResponse.json(
        { error: `Ya perteneces a otro evento (${existsOther.code}). Solo se permite un evento a la vez.` },
        { status: 409 }
      );
    }

    const publicId = crypto.randomBytes(6).toString("base64url").slice(0, 8);
    await conn.query(
      `INSERT INTO participants (event_id, user_id, public_id, alias, wishlist)
       VALUES (?, ?, ?, '', '')`,
      [ev.id, uid, publicId]
    );

    return NextResponse.json({ ok: true, joined: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Join failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
