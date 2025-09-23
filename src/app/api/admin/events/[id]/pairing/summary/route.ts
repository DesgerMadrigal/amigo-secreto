export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

// Descubre las columnas reales de la tabla `pairs`.
async function getPairsColumns(conn: any): Promise<{ giverCol: string; receiverCol: string }> {
  const rows = await conn.query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'pairs'
       AND COLUMN_NAME IN (
         'giver_participant_id','receiver_participant_id',
         'giver_id','receiver_id',
         'a_participant_id','b_participant_id',
         'a_id','b_id'
       )`
  );
  const names = rows.map((r: any) => String(r.name));

  const giverCol =
    names.includes("giver_participant_id") ? "giver_participant_id" :
    names.includes("giver_id")             ? "giver_id"             :
    names.includes("a_participant_id")     ? "a_participant_id"     :
    names.includes("a_id")                 ? "a_id"                 : "";

  const receiverCol =
    names.includes("receiver_participant_id") ? "receiver_participant_id" :
    names.includes("receiver_id")             ? "receiver_id"             :
    names.includes("b_participant_id")        ? "b_participant_id"        :
    names.includes("b_id")                    ? "b_id"                    : "";

  if (!giverCol || !receiverCol) {
    throw new Error(
      "La tabla `pairs` no contiene columnas compatibles. Esperado: (a_participant_id/b_participant_id) o equivalentes."
    );
  }
  return { giverCol, receiverCol };
}

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
      "SELECT id, owner_user_id, code, name, status, allow_single FROM events WHERE id=? LIMIT 1",
      [eventId]
    );
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (ev.owner_user_id !== uid)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ cnt: participants }] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM participants WHERE event_id=?",
      [eventId]
    );

    const { giverCol, receiverCol } = await getPairsColumns(conn);

    // Conteos
    const [{ pairs }] = await conn.query(
      `SELECT COUNT(*) AS pairs FROM pairs WHERE event_id=? AND ${receiverCol} IS NOT NULL`,
      [eventId]
    );
    const [{ singles }] = await conn.query(
      `SELECT COUNT(*) AS singles FROM pairs WHERE event_id=? AND ${receiverCol} IS NULL`,
      [eventId]
    );

    // (Opcional) Resumen de alias para UI
    const list = await conn.query(
      `
      SELECT
        COALESCE(NULLIF(pg.alias,''), ug.username) AS giver_alias,
        COALESCE(NULLIF(pr.alias,''), ur.username) AS receiver_alias
      FROM pairs x
      JOIN participants pg ON pg.id = x.${giverCol}
      JOIN users ug        ON ug.id = pg.user_id
      LEFT JOIN participants pr ON pr.id = x.${receiverCol}
      LEFT JOIN users ur        ON ur.id = pr.user_id
      WHERE x.event_id = ?
      ORDER BY x.id ASC
      `,
      [eventId]
    );

    return NextResponse.json({
      id: ev.id,
      name: ev.name,
      code: ev.code,
      status: ev.status,
      allow_single: ev.allow_single,
      participants,
      pairs,
      singles,
      list, // puedes omitirlo si solo quieres conteos
    });
  } catch (e: any) {
    console.error("[pairing/summary] error:", e);
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
