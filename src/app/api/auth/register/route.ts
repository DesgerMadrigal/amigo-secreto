import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

const schema = z.object({
  username: z.string().min(3).max(60),
  password: z.string().min(6).max(128),
  alias: z.string().min(2).max(80),
  wishlist: z.string().max(5000).optional().default(""),
  eventCode: z.string().min(3).max(40).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { username, password, alias, wishlist, eventCode } = parsed.data;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) crear user
    const [exists] = await conn.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (exists) {
      await conn.rollback();
      return NextResponse.json({ error: "Usuario ya existe" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const resUser = await conn.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')",
      [username, hash]
    );
    const userId = resUser.insertId;

    // 2) si se pasó eventCode, unir al evento
    if (eventCode) {
      const [ev] = await conn.query("SELECT id FROM events WHERE code = ? LIMIT 1", [eventCode]);
      if (!ev) {
        await conn.rollback();
        return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
      }
      const eventId = ev.id;

      // evitar doble unión
      const [already] = await conn.query(
        "SELECT id FROM participants WHERE event_id = ? AND user_id = ? LIMIT 1",
        [eventId, userId]
      );
      if (!already) {
        const publicId = genPublicId();
        await conn.query(
          "INSERT INTO participants (event_id, user_id, public_id, alias, wishlist) VALUES (?, ?, ?, ?, ?)",
          [eventId, userId, publicId, alias, wishlist || ""]
        );
      }
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    return NextResponse.json({ error: "Error registrando usuario" }, { status: 500 });
  } finally {
    conn.release();
  }
}

function genPublicId() {
  const s = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `P-${s}`;
}
