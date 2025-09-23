// src/app/dashboard/page.tsx
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import { pool } from "@/lib/db";
import Link from "next/link";
import ParticipantDashboardClient from "@/components/ParticipantDashboardClient";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import SignOutButton from "@/components/SignOutButton";
import LeaveEventButton from "@/components/LeaveEventButton";
import FestiveShell from "@/components/FestiveShell"; // 👈 ahora es un Client Component

// ---------- DATA HELPERS ----------
async function getOwnedEvents(ownerId: number) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(
      `SELECT id, code, name, date_utc, tz, budget_max, status
       FROM events
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`,
      [ownerId]
    );
  } finally {
    conn.release();
  }
}

async function getMyEvents(userId: number) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(
      `SELECT e.id, e.code, e.name, e.date_utc, e.tz, e.budget_max, e.status
       FROM events e
       JOIN participants p ON p.event_id = e.id
       WHERE p.user_id = ?
       ORDER BY e.created_at DESC`,
      [userId]
    );
  } finally {
    conn.release();
  }
}

// ---------- UI HELPERS ----------
function formatCRC(v: any) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(n);
}

function statusBadge(s?: string) {
  const map: Record<string, { text: string; cls: string; icon: string }> = {
    draft:  { text: "Borrador", cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: "📝" },
    open:   { text: "Abierto",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: "🟢" },
    locked: { text: "Bloqueado",cls: "bg-rose-50 text-rose-700 ring-rose-200", icon: "🔒" },
  };
  const meta = map[s ?? "draft"] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ${meta.cls}`}>
      <span aria-hidden>{meta.icon}</span>{meta.text}
    </span>
  );
}

// ---------- PAGE ----------
export default async function Dashboard() {
  const session = await getServerSession(authConfig);
  const uid = Number((session as any)?.user?.id || 0);
  const role = (session as any)?.user?.role as "admin" | "user" | undefined;
  const username = (session as any)?.user?.name as string | undefined;

  if (!uid) {
    return (
      <FestiveShell>
        <main className="min-h-screen grid place-items-center px-4 py-10">
          <div className="w-full max-w-md rounded-2xl bg-white/90 shadow-xl ring-1 ring-black/5 p-6">
            <h1 className="text-2xl font-semibold text-gray-900">No autenticado</h1>
            <p className="mt-2 text-sm text-gray-700">Inicia sesión para ver tu panel.</p>
            <Link href="/login" className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-white hover:opacity-90">
              Ir a iniciar sesión
            </Link>
          </div>
        </main>
      </FestiveShell>
    );
  }

  if (role === "admin") {
    const owned = await getOwnedEvents(uid);
    return (
      <FestiveShell>
        <header className="px-4 pt-6">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow">
              <span aria-hidden>🎄</span> Administración — {username}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className="px-4 py-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
              <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 p-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>🧭</span>
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Panel de administración</h2>
                </div>
                <p className="mt-1 text-sm text-gray-700">Crea, gestiona y bloquea tus eventos de Amigo Secreto.</p>
                <div className="mt-4">
                  <AdminDashboardClient initialEvents={owned} />
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-gray-700">
              © {new Date().getFullYear()} Amigo Secreto — hecho con 🎁
            </p>
          </div>
        </main>
      </FestiveShell>
    );
  }

  const myEvents = await getMyEvents(uid);

  return (
    <FestiveShell>
      <header className="px-4 pt-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow">
            <span aria-hidden>🎁</span> Hola — {username}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Unirme por código */}
          <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 p-6">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>✨</span>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Unirme a un evento</h2>
              </div>
              <p className="mt-1 text-sm text-gray-700">Ingresa el código que te compartieron para participar.</p>
              <div className="mt-4">
                <ParticipantDashboardClient initialEvents={myEvents} />
              </div>
            </div>
          </div>

          {/* Mis eventos */}
          <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
            <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 p-6">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>🗓️</span>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Mis eventos</h2>
              </div>
              <p className="mt-1 text-sm text-gray-700">Eventos a los que te has unido.</p>

              {myEvents.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl" aria-hidden>🎅</div>
                  <p className="mt-2 text-gray-700">Aún no te has unido a ningún evento.</p>
                  <p className="text-sm text-gray-600">Pide un código y únete desde el formulario de arriba.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {myEvents.map((e: any) => {
                    const when = new Date(
                      ((typeof e.date_utc === "string" ? e.date_utc : String(e.date_utc)).includes("T")
                        ? e.date_utc
                        : String(e.date_utc).replace(" ", "T")) + "Z"
                    );
                    const whenStr = when.toLocaleString();

                    return (
                      <div key={e.id} className="group relative p-[1px] rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
                        <div className="rounded-2xl h-full bg-white/90 backdrop-blur-sm ring-1 ring-black/5 p-5 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-lg" aria-hidden>🎄</span>
                                <h3 className="font-semibold text-gray-900 truncate">{e.name}</h3>
                              </div>
                              <div className="mt-1 text-sm text-gray-700">
                                {whenStr} <span className="text-gray-500">({e.tz})</span>
                              </div>
                              <div className="mt-1 text-sm text-gray-700">
                                Presupuesto: <span className="font-medium">{formatCRC(e.budget_max)}</span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Código: <code className="font-mono">{e.code}</code>
                              </div>
                            </div>
                            {statusBadge(e.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              className="px-4 py-2.5 rounded-lg bg-gray-900 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-900/40"
                              href={`/e/${e.code}`}
                            >
                              Ver evento
                            </Link>

                            <LeaveEventButton code={e.code} locked={e.status === "locked"} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-700">
            © {new Date().getFullYear()} Amigo Secreto — hecho con ❤️, cocoa caliente y galletas 🍪
          </p>
        </div>
      </main>
    </FestiveShell>
  );
}
