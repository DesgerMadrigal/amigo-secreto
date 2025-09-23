export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(`SELECT id FROM events WHERE code=? LIMIT 1`, [params.code]);
    if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const items = await conn.query(
      `SELECT alias, public_id, created_at FROM participants WHERE event_id=? ORDER BY created_at ASC`,
      [ev.id]
    );
    return NextResponse.json({ items });
  } finally {
    conn.release();
  }
}
