// src/app/admin/events/[id]/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import Link from "next/link";

async function getData(id: number) {
  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(
      "SELECT id, owner_user_id, code, name, date_utc, tz, budget_max, allow_single, reveal_mode, status FROM events WHERE id=? LIMIT 1",
      [id]
    );
    if (!ev) return null;
    const parts = await conn.query(
      "SELECT public_id, alias, created_at FROM participants WHERE event_id=? ORDER BY created_at ASC",
      [id]
    );
    const counts = await conn.query(
      "SELECT COUNT(*) AS total FROM participants WHERE event_id=?",
      [id]
    );
    return { ev, parts, total: counts[0]?.total ?? 0 };
  } finally { conn.release(); }
}

export default async function AdminEventDetail({ params }: { params: { id: string }}) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role;
  if (!uid || role !== "admin") return <div className="p-6">No autorizado.</div>;

  const data = await getData(Number(params.id));
  if (!data) return <div className="p-6">Evento no encontrado.</div>;
  const { ev, parts, total } = data;

  if (ev.owner_user_id !== uid) return <div className="p-6">No eres dueño de este evento.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ev.name}</h1>
          <p className="text-sm opacity-70">
            Código: {ev.code} · {new Date((ev.date_utc.includes("T")?ev.date_utc:ev.date_utc.replace(" ","T"))+"Z").toLocaleString()} ({ev.tz}) · Presupuesto: ₡{Number(ev.budget_max).toFixed(2)} · Estado: {ev.status}
          </p>
        </div>
        <Link className="border rounded px-3 py-1.5" href={`/admin/events/${ev.id}/pairing`}>Ir a mezcla</Link>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Participantes ({total})</h2>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Alias</th>
                <th className="text-left p-2">ID público</th>
                <th className="text-left p-2">Fecha de registro</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p:any)=>(
                <tr key={p.public_id} className="border-t">
                  <td className="p-2">{p.alias}</td>
                  <td className="p-2 font-mono">{p.public_id}</td>
                  <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {parts.length === 0 && (
                <tr><td className="p-3 opacity-60" colSpan={3}>Aún no hay participantes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
