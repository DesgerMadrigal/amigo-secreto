// src/app/dashboard/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import Link from "next/link";

type EventRow = {
  id: number;
  code: string;
  name: string;
  date_utc: string;
  tz: string;
  budget_max: number | string;
  status: "draft" | "locked";
};

function fmtDateUTC(d: string, tz: string) {
  const iso = d.includes("T") ? d : d.replace(" ", "T");
  const date = new Date(iso + "Z");
  return `${date.toLocaleString()} (${tz})`;
}

async function getMyEvents(userId: number): Promise<EventRow[]> {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(
      `SELECT e.id, e.code, e.name, e.date_utc, e.tz, e.budget_max, e.status
       FROM events e
       JOIN participants p ON p.event_id = e.id
       WHERE p.user_id = ?
       ORDER BY e.created_at DESC`,
      [userId]
    );
    return rows as EventRow[];
  } finally {
    conn.release();
  }
}

export default async function Dashboard() {
  const session = await getServerSession(authConfig);
  const userId = Number((session as any)?.user?.id || 0);

  if (!userId) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">No autenticado</h1>
        <p className="opacity-80">Inicia sesión para ver tu panel.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded bg-black text-white">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  let events: EventRow[] = [];
  try {
    events = await getMyEvents(userId);
  } catch (e) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Error cargando tus eventos</h1>
        <pre className="p-3 rounded bg-gray-100 text-sm overflow-auto">
          {String((e as Error).message || e)}
        </pre>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mi panel</h1>

      {events.length === 0 ? (
        <p className="opacity-70">Aún no te has unido a ningún evento.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-sm opacity-70">
                  {fmtDateUTC(e.date_utc, e.tz)} · Presupuesto máx: ₡{Number(e.budget_max).toFixed(2)} · Estado: {e.status}
                </div>
              </div>
              <Link className="px-3 py-1.5 rounded border" href={`/e/${e.code}`}>
                Ver evento
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
