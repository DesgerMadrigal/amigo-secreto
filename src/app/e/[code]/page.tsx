import { pool } from "@/lib/db";
import Link from "next/link";

async function getData(code: string) {
  const conn = await pool.getConnection();
  try {
    const [event] = await conn.query(
      "SELECT id, name, date_utc, tz, budget_max, status, reveal_mode FROM events WHERE code = ? LIMIT 1",
      [code]
    );
    if (!event) return null;
    const participants = await conn.query(
      "SELECT public_id, alias FROM participants WHERE event_id = ? ORDER BY created_at ASC",
      [event.id]
    );
    return { event, participants };
  } finally {
    conn.release();
  }
}

export default async function EventPublicPage({ params }: { params: { code: string } }) {
  const data = await getData(params.code);
  if (!data) return <div className="p-6">Evento no encontrado.</div>;

  const { event, participants } = data;
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{event.name}</h1>
      <p className="text-sm opacity-80">
        Fecha: {new Date(event.date_utc + "Z").toLocaleString()} ({event.tz}) · Presupuesto máx: ₡{Number(event.budget_max).toFixed(2)}
      </p>

      <div className="flex items-center gap-3">
        <Link
          className="px-4 py-2 rounded bg-black text-white"
          href={`/register?eventCode=${params.code}`}
        >
          Crear cuenta y unirme
        </Link>
        <Link className="px-4 py-2 rounded border" href="/login">
          Ya tengo cuenta
        </Link>
      </div>

      <div>
        <h2 className="font-semibold mt-4 mb-2">Participantes</h2>
        <ul className="divide-y rounded border">
          {participants.map((p: any) => (
            <li key={p.public_id} className="p-3 flex justify-between">
              <span>{p.alias}</span>
              <span className="font-mono text-sm opacity-70">{p.public_id}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
