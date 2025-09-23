// src/app/admin/events/[id]/pairing/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  id: number; name: string; code: string;
  status: "draft"|"locked";
  allow_single: 0|1;
  participants: number;
  pairs: number;
  singles: number;
};

export default function PairingPage({ params }: { params: { id: string }}) {
  const eventId = Number(params.id);
  const [data, setData] = useState<Summary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/events/${eventId}/pairing/summary`, { cache: "no-store" });
    const j = await res.json();
    setData(j);
  }
  useEffect(()=>{ load(); }, [eventId]);

  async function call(path: string) {
    setLoading(true); setMsg(null);
    const res = await fetch(path, { method:"POST" });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) setMsg(j?.error || "Error");
    await load();
    setLoading(false);
  }

  if (!data) return <div className="p-6">Cargando…</div>;
  const isDraft = data.status === "draft";

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mezcla · {data.name}</h1>
        <Link className="border rounded px-3 py-1.5" href={`/admin/events/${eventId}`}>Volver</Link>
      </div>

      <div className="rounded border p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><b>Código</b><div>{data.code}</div></div>
          <div><b>Estado</b><div>{data.status}</div></div>
          <div><b>Participantes</b><div>{data.participants}</div></div>
          <div><b>Parejas</b><div>{data.pairs}</div></div>
          <div><b>Solos</b><div>{data.singles}</div></div>
          <div><b>Permitir solo</b><div>{data.allow_single ? "Sí" : "No"}</div></div>
        </div>
      </div>

      {msg && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{msg}</div>}

      <div className="flex gap-3">
        <button disabled={loading || !isDraft} onClick={()=>call(`/api/admin/events/${eventId}/pairing/generate`)}
          className={`px-4 py-2 rounded text-white ${isDraft ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}>
          Generar / Regenerar
        </button>
        <button disabled={loading || !isDraft} onClick={()=>call(`/api/admin/events/${eventId}/pairing/lock`)}
          className={`px-4 py-2 rounded text-white ${isDraft ? "bg-emerald-600" : "bg-gray-400 cursor-not-allowed"}`}>
          Sellar mezcla
        </button>
        <button disabled={loading || isDraft} onClick={()=>call(`/api/admin/events/${eventId}/pairing/unlock`)}
          className={`px-4 py-2 rounded text-white ${!isDraft ? "bg-amber-600" : "bg-gray-400 cursor-not-allowed"}`}>
          Desbloquear
        </button>
      </div>

      <p className="text-sm opacity-70">
        Al **sellar**, se revela a los participantes según el modo configurado. El admin nunca ve las parejas.
      </p>
    </div>
  );
}
