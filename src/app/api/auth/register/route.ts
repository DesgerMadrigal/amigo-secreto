export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type Body = {
  username?: string;   // será igual al alias
  password?: string;
  alias?: string;      // obligatorio, y username = alias
  wishlist?: string;
  eventCode?: string;  // obligatorio
};

const jsonSafe = (obj: any) =>
  JSON.parse(JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? Number(v) : v)));

export async function POST(req: NextRequest) {
  let data: Body | null = null;
  try { data = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  // alias obligatorio; username = alias
  const alias = (data?.alias || data?.username || "").trim();
  const username = alias; // ← clave del cambio
  const password = data?.password || "";
  const wishlist = (data?.wishlist || "").trim();
  const eventCode = (data?.eventCode || "").trim();

  if (!alias) return NextResponse.json({ error: "El alias es obligatorio" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "Contraseña mínima de 8 caracteres" }, { status: 400 });
  if (!eventCode) return NextResponse.json({ error: "Debes indicar el código de evento" }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query("SELECT id FROM events WHERE code = ? LIMIT 1", [eventCode]);
    if (!ev) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

    // usuario único por username (= alias)
    const [exists] = await conn.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (exists) return NextResponse.json({ error: "El alias/usuario ya existe" }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const r = await conn.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')",
      [username, hash]
    );
    const userIdNum = Number(r.insertId);
    const userId = Number.isNaN(userIdNum) ? String(r.insertId) : userIdNum;

    // asociar al evento (siempre, es obligatorio)
    const [already] = await conn.query(
      "SELECT id FROM participants WHERE user_id=? AND event_id=? LIMIT 1",
      [userId, ev.id]
    );
    if (!already) {
      const publicId = crypto.randomBytes(6).toString("base64url").slice(0, 8);
      await conn.query(
        `INSERT INTO participants (event_id, user_id, public_id, alias, wishlist)
         VALUES (?, ?, ?, ?, ?)`,
        [ev.id, userId, publicId, alias, wishlist]
      );
    }

    return NextResponse.json(jsonSafe({ ok: true, userId }), { status: 201 });
  } catch (e:any) {
    if (String(e?.code) === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "El alias/usuario ya existe" }, { status: 409 });
    }
    console.error("[register] error:", e);
    return NextResponse.json({ error: "Error en el registro" }, { status: 500 });
  } finally {
    conn.release();
  }
}
