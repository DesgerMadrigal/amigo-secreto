// src/app/api/admin/events/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  // ✅ en vez de auth(), usa getServerSession(authConfig)
  const session = await getServerSession(authConfig);
  const ownerId = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role;

  if (!ownerId || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { code, name, dateUTC, tz, budgetMax, allowSingle, revealMode } = body || {};
  if (!code || !name || !dateUTC) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    const r = await conn.query(
      `INSERT INTO events 
        (owner_user_id, code, name, date_utc, tz, budget_max, allow_single, reveal_mode, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        ownerId,
        code,
        name,
        dateUTC,
        tz || "UTC",
        Number(budgetMax) || 0,
        allowSingle ? 1 : 0,
        revealMode || "on_date",
      ]
    );

    const [ev] = await conn.query(
      `SELECT id, code, name, date_utc, tz, budget_max, status 
       FROM events WHERE id = ? LIMIT 1`,
      [r.insertId]
    );

    return NextResponse.json({ ok: true, event: ev });
  } catch (e: any) {
    if (String(e?.code) === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Código ya existe" }, { status: 409 });
    }
    console.error("[create event] error:", e);
    return NextResponse.json({ error: "Error al crear" }, { status: 500 });
  } finally {
    conn.release();
  }
}
