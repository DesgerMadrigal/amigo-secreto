// src/app/admin/events/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import Link from "next/link";

async function getMyEvents(ownerId: number) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(
      `SELECT id, code, name, date_utc, tz, budget_max, status
       FROM events WHERE owner_user_id = ?
       ORDER BY created_at DESC`,
      [ownerId]
    );
  } finally { conn.release(); }
}

export default async function AdminEventsPage() {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role;
  if (!uid || role !== "admin") return <div className="p-6">No autorizado.</div>;

  const events = await getMyEvents(uid);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis eventos</h1>
        <Link href="/admin/events/new" className="rounded bg-black text-white px-3 py-1.5">
          + Nuevo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="opacity-70">Aún no has creado eventos.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e: any) => (
            <div key={e.id} className="p-4 border rounded flex items-center justify-between">
              <div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-sm opacity-70">
                  Código: {e.code} · {new Date((e.date_utc.includes("T")?e.date_utc:e.date_utc.replace(" ","T"))+"Z").toLocaleString()} ({e.tz}) · Estado: {e.status}
                </div>
              </div>
              <div className="flex gap-2">
                <Link className="border rounded px-3 py-1.5" href={`/admin/events/${e.id}`}>Ver</Link>
                <Link className="border rounded px-3 py-1.5" href={`/admin/events/${e.id}/pairing`}>Mezcla</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
