export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role as "admin" | "user" | undefined;
  if (!uid || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const eventId = Number(id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ev] = await conn.query(
      "SELECT id, owner_user_id, allow_single FROM events WHERE id=? LIMIT 1",
      [eventId]
    );
    if (!ev || ev.owner_user_id !== uid) {
      await conn.rollback();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parts: Array<{ id: number }> = await conn.query(
      "SELECT id FROM participants WHERE event_id=? ORDER BY created_at ASC",
      [eventId]
    );
    if (parts.length < 1) {
      await conn.rollback();
      return NextResponse.json({ error: "No hay participantes" }, { status: 400 });
    }

    const ids = shuffle(parts.map((p) => p.id));

    // Limpia pares previos
    await conn.query("DELETE FROM pairs WHERE event_id=?", [eventId]);

    const { giverCol, receiverCol } = await getPairsColumns(conn);

    if (ids.length === 1) {
      // Un solo participante → si allow_single, dejalo como single
      if (!ev.allow_single) {
        await conn.rollback();
        return NextResponse.json({ error: "Se requiere al menos 2 participantes" }, { status: 400 });
      }
      const sql = `INSERT INTO pairs (event_id, ${giverCol}, ${receiverCol}) VALUES (?, ?, NULL)`;
      await conn.query(sql, [eventId, ids[0]]);
      await conn.commit();
      return NextResponse.json({ ok: true, pairs: 0, singles: 1 });
    }

    // Si impar y permitido: deja 1 sin receptor
    const usableLen = ids.length % 2 === 1 && ev.allow_single ? ids.length - 1 : ids.length;

    if (usableLen >= 2) {
      for (let i = 0; i < usableLen; i++) {
        const giver = ids[i];
        const receiver = ids[(i + 1) % usableLen]; // circular
        if (giver === receiver) continue;
        const sql = `INSERT INTO pairs (event_id, ${giverCol}, ${receiverCol}) VALUES (?, ?, ?)`;
        await conn.query(sql, [eventId, giver, receiver]);
      }
    }

    if (ids.length !== usableLen) {
      // Dejar al último como single (receptor NULL)
      const single = ids[ids.length - 1];
      const sql = `INSERT INTO pairs (event_id, ${giverCol}, ${receiverCol}) VALUES (?, ?, NULL)`;
      await conn.query(sql, [eventId, single]);
    }

    await conn.commit();
    const totalPairs = usableLen >= 2 ? usableLen : 0;
    const singles = ids.length - usableLen;
    return NextResponse.json({ ok: true, pairs: totalPairs, singles });
  } catch (e: any) {
    await conn.rollback();
    console.error("[pairing/generate] error:", e);
    return NextResponse.json({ error: e?.message || "Generate failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
