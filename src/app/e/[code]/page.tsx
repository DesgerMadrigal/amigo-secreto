export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import Link from "next/link";
import ParticipantClient from "./participant.client";

type EventRow = {
  id: number;
  owner_user_id: number;
  code: string;
  name: string;
  date_utc: string | Date;
  tz: string;
  budget_max: number;
  reveal_mode: "on_date" | "on_lock";
  status: "draft" | "locked";
  allow_single: 0 | 1;
};

function fmtLocal(d: string | Date, tz: string) {
  let dt: Date;
  if (d instanceof Date) {
    dt = new Date(
      Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds()
      )
    );
  } else {
    const iso = d.includes("T") ? d : d.replace(" ", "T");
    dt = new Date(iso + "Z");
  }
  return `${dt.toLocaleString()} (${tz})`;
}

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

async function getEventByCode(code: string): Promise<EventRow | null> {
  const conn = await pool.getConnection();
  try {
    const [row] = await conn.query(
      `SELECT id, owner_user_id, code, name, date_utc, tz, budget_max, reveal_mode, status, allow_single
       FROM events WHERE code = ? LIMIT 1`,
      [code]
    );
    return row || null;
  } finally {
    conn.release();
  }
}

async function getInitialMe(code: string, userId: number) {
  const conn = await pool.getConnection();
  try {
    const [ev] = await conn.query(
      `SELECT id, owner_user_id, code, name, date_utc, tz, budget_max, reveal_mode, status, allow_single
       FROM events WHERE code = ? LIMIT 1`,
      [code]
    );
    if (!ev) return { event: null };

    // Fallback alias: si p.alias vacío, usar users.username
    const [me] = await conn.query(
      `SELECT p.id,
              COALESCE(NULLIF(p.alias, ''), u.username) AS alias,
              p.wishlist
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ? AND p.event_id = ? LIMIT 1`,
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
         WHERE pr.event_id = ? AND p1.user_id = ? LIMIT 1
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
       WHERE p.event_id = ?
       ORDER BY p.created_at ASC`,
      [ev.id]
    );

    return { event: ev, me: me || null, participants, canReveal, myPair };
  } finally {
    conn.release();
  }
}

// ⚠️ Next 15: params es un Promise; usar await.
export default async function EventPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const { code } = await params;

  const ev = await getEventByCode(code);
  if (!ev) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-2xl bg-white shadow p-6">
          <h1 className="text-2xl font-semibold">Evento no encontrado</h1>
          <p className="mt-2">Revisa el código: <b>{code}</b></p>
          <Link className="mt-4 inline-block px-3 py-1.5 rounded bg-black text-white" href="/dashboard">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
        <main className="min-h-screen grid place-items-center px-4 py-10">
          <div className="w-full max-w-md rounded-2xl bg-white shadow ring-1 ring-black/5 p-6">
            <h1 className="text-2xl font-semibold text-gray-900">Inicia sesión para unirte</h1>
            <p className="mt-2 text-sm text-gray-700">
              Evento <b>{ev.name}</b> — {fmtLocal(ev.date_utc, ev.tz)} — Presupuesto ₡{Number(ev.budget_max).toFixed(2)}
            </p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/e/${ev.code}`)}`}
              className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const initial = await getInitialMe(code, uid);

  return (
    <div className="relative min-h-screen text-gray-700">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow-sm">
            <span aria-hidden>🎄</span> {ev.name} — <code className="font-mono">{ev.code}</code>
          </span>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">Volver al panel</Link>
        </div>
      </header>

      <main className="px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl bg-white shadow ring-1 ring-black/5 p-6">
            <h2 className="text-xl font-semibold text-gray-900">Detalles del evento</h2>
            <div className="mt-2 text-sm">
              <div>Fecha: <b className="text-gray-900">{fmtLocal(ev.date_utc, ev.tz)}</b></div>
              <div>Monto: <b className="text-gray-900">₡{Number(ev.budget_max).toFixed(2)}</b></div>
              <div>Modo de revelación: <b className="text-gray-900">
                {ev.reveal_mode === "on_lock" ? "Al sellar la mezcla" : "En la fecha del evento"}
              </b></div>
              <div>Estado: <b className="text-gray-900">{ev.status}</b></div>
            </div>
          </div>

          <ParticipantClient code={code} initial={initial} />
        </div>
      </main>
    </div>
  );
}
