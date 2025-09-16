import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { auth } from "@/auth";

const schema = z.object({
  code: z.string().min(3).max(40),
  name: z.string().min(3).max(120),
  dateUTC: z.string(), // ISO "2025-12-24T18:00:00Z" o "2025-12-24 18:00:00"
  tz: z.string().default("America/Costa_Rica"),
  budgetMax: z.number().nonnegative().default(0),
  allowSingle: z.boolean().default(true),
  revealMode: z.enum(["on_lock","on_date"]).default("on_date"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const ownerId = Number((session as any)?.user?.id || 0);
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { code, name, dateUTC, tz, budgetMax, allowSingle, revealMode } = parsed.data;

  const conn = await pool.getConnection();
  try {
    const [exists] = await conn.query("SELECT id FROM events WHERE code = ? LIMIT 1", [code]);
    if (exists) return NextResponse.json({ error: "Code ya existe" }, { status: 409 });

    await conn.query(
      "INSERT INTO events (owner_user_id, code, name, date_utc, tz, budget_max, allow_single, reveal_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [ownerId, code, name, dateUTC, tz, budgetMax, allowSingle ? 1 : 0, revealMode]
    );
    return NextResponse.json({ ok: true });
  } finally {
    conn.release();
  }
}
