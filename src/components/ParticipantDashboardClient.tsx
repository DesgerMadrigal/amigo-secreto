// src/components/ParticipantDashboardClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ParticipantDashboardClient({ initialEvents }: { initialEvents: any[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const alreadyInEvent = initialEvents.length > 0;

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(code.trim())}/join`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "No fue posible unirse al evento");
      // si todo bien, vamos directo al evento
      router.replace(`/e/${code.trim()}`);
    } catch (err: any) {
      setMsg(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
      <h2 className="text-2xl font-semibold text-gray-900">Unirme a un evento</h2>
      <p className="mt-1 text-sm text-gray-700">
        Ingresa el código del evento para unirte. {alreadyInEvent && "Solo puedes estar en un evento a la vez."}
      </p>

      {msg && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {msg}
        </div>
      )}

      <form onSubmit={joinByCode} className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="Ej: XMAS2025"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={loading}
        />
        <button
          className={`rounded-lg px-4 py-2.5 text-white ${loading ? "bg-gray-400" : "bg-black hover:opacity-90"}`}
          disabled={loading || !code.trim()}
        >
          {loading ? "Uniendo…" : "Unirme"}
        </button>
      </form>

      {alreadyInEvent && (
        <p className="mt-2 text-xs text-gray-600">
          Si ya estás en un evento, no podrás unirte a otro (la organización lo ha limitado a uno por persona).
        </p>
      )}
    </div>
  );
}
