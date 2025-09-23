export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

const jsonSafe = (obj: any) =>
  JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)));

// Detecta columnas reales en `pairs`
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

async function loadState(code: string, userId: number) {
  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(
      `SELECT id, code, name, date_utc, tz, budget_max, reveal_mode, status
       FROM events WHERE code=? LIMIT 1`,
      [code]
    );
    if (!ev) return { event: null };

    const [me] = await conn.query(
      `SELECT p.id,
              COALESCE(NULLIF(p.alias,''), u.username) AS alias,
              p.wishlist
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id=? AND p.event_id=? LIMIT 1`,
      [userId, ev.id]
    );

    const now = new Date();
    const eventDate = new Date(
      (typeof ev.date_utc === "string" ? ev.date_utc.replace(" ", "T") : ev.date_utc) + "Z"
    );
    const canReveal =
      (ev.reveal_mode === "on_lock" && ev.status === "locked") ||
      (ev.reveal_mode === "on_date" && now >= eventDate);

    let myPair: any = null;
    if (canReveal && me?.id) {
      const { giverCol, receiverCol } = await getPairsColumns(conn);
      const [pairRow] = await conn.query(
        `
         SELECT COALESCE(NULLIF(p2.alias,''), u2.username) AS target_alias,
                p2.wishlist AS target_wishlist
         FROM pairs pr
         JOIN participants p1 ON p1.id = pr.${giverCol}
         LEFT JOIN participants p2 ON p2.id = pr.${receiverCol}
         LEFT JOIN users u2 ON u2.id = p2.user_id
         WHERE pr.event_id=? AND p1.user_id=? LIMIT 1
        `,
        [ev.id, userId]
      );
      myPair = pairRow || null;
    }

    const participants = await conn.query(
      `SELECT COALESCE(NULLIF(p.alias,''), u.username) AS alias,
              p.created_at
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.event_id=?
       ORDER BY p.created_at ASC`,
      [ev.id]
    );

    return { event: ev, me: me || null, participants, canReveal, myPair };
  } finally {
    conn.release();
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> } // 👈 Next 15
) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await ctx.params; // 👈 await
  const data = await loadState(code, uid);
  return NextResponse.json(jsonSafe(data));
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> } // 👈 Next 15
) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await ctx.params; // 👈 await
  const { alias, wishlist } = (await req.json().catch(() => ({}))) as {
    alias?: string; wishlist?: string;
  };

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(`SELECT id FROM events WHERE code=? LIMIT 1`, [code]);
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const [me] = await conn.query(
      `SELECT id FROM participants WHERE user_id=? AND event_id=? LIMIT 1`,
      [uid, ev.id]
    );
    if (!me) return NextResponse.json({ error: "No estás en este evento" }, { status: 400 });

    await conn.query(
      `UPDATE participants SET alias=?, wishlist=? WHERE id=?`,
      [alias ?? "", wishlist ?? "", me.id]
    );

    const data = await loadState(code, uid);
    return NextResponse.json(jsonSafe(data));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
