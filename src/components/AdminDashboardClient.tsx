// src/components/AdminDashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type EventRow = {
  id: number;
  code: string;
  name: string;
  date_utc: string | Date;
  tz: string;
  budget_max: number | string;
  status: "draft" | "locked";
};

type Summary = {
  id: number; name: string; code: string;
  status: "draft"|"locked";
  allow_single: 0|1;
  participants: number;
  pairs: number;
  singles: number;
};

export default function AdminDashboardClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents || []);
  const [selectedId, setSelectedId] = useState<number | null>(events[0]?.id ?? null);

  // create form
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    dateLocal: "",
    tz: "America/Costa_Rica",
    budgetMax: 0,
    allowSingle: true,
    revealMode: "on_date" as "on_date"|"on_lock",
  });
  const [globalErr, setGlobalErr] = useState<string|null>(null);

  // summary + participants of selected
  const [summary, setSummary] = useState<Summary | null>(null);
  const [parts, setParts] = useState<any[]>([]);
  const isDraft = summary?.status === "draft";

  function toDateUTCString(dtLocal: string) {
    if (!dtLocal) return "";
    const d = new Date(dtLocal);
    const pad = (n:number)=>String(n).padStart(2,"0");
    return `${d.getUTCFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  async function reloadSelected(id: number) {
    const [s, p] = await Promise.all([
      fetch(`/api/admin/events/${id}/pairing/summary`, { cache: "no-store" }).then(r=>r.json()),
      fetch(`/api/admin/events/${id}/participants`, { cache: "no-store" }).then(r=>r.json()),
    ]);
    setSummary(s);
    setParts(p?.items || []);
  }

  useEffect(() => { if (selectedId) reloadSelected(selectedId); }, [selectedId]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setGlobalErr(null);
    setCreating(true);
    try {
      const dateUTC = toDateUTCString(form.dateLocal);
      const res = await fetch("/api/admin/events", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          dateUTC, tz: form.tz,
          budgetMax: Number(form.budgetMax),
          allowSingle: !!form.allowSingle,
          revealMode: form.revealMode
        })
      });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.error || "No se pudo crear");

      const created: EventRow = j.event;
      setEvents(evts => [created, ...evts]);
      setSelectedId(created.id);
      setForm({ code:"", name:"", dateLocal:"", tz:"America/Costa_Rica", budgetMax:0, allowSingle:true, revealMode:"on_date" });
    } catch (e:any) {
      setGlobalErr(e.message || "Error");
    } finally { setCreating(false); }
  }

  async function doCall(path: string) {
    if (!selectedId) return;
    const res = await fetch(path, { method:"POST" });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) { setGlobalErr(j?.error || "Acción fallida"); return; }
    await reloadSelected(selectedId);
    setGlobalErr(null);
  }

  const disabledGen   = !(summary?.status === "draft") || !selectedId;
  const disabledLock  = !(summary?.status === "draft") || !selectedId;
  const disabledUnlk  =  (summary?.status === "draft") || !selectedId;

  const selected = useMemo(()=>events.find(e=>e.id===selectedId) ?? null, [events, selectedId]);

  return (
    <div className="space-y-6 text-gray-700">
      {/* CREAR EVENTO */}
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Crear evento</h2>
        </div>
        {globalErr && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {globalErr}
          </div>
        )}
        <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">Código</label>
            <input className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.code} onChange={e=>setForm(f=>({ ...f, code:e.target.value }))} placeholder="XMAS2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Nombre</label>
            <input className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} placeholder="Intercambio Navideño" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Fecha y hora (tu zona)</label>
            <input type="datetime-local" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.dateLocal} onChange={e=>setForm(f=>({ ...f, dateLocal:e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Zona horaria</label>
            <input className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.tz} onChange={e=>setForm(f=>({ ...f, tz:e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Presupuesto máx</label>
            <input type="number" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.budgetMax as any} onChange={e=>setForm(f=>({ ...f, budgetMax:e.target.value as any }))} />
          </div>
          <div className="flex items-center gap-2">
            <input id="allow" type="checkbox" checked={form.allowSingle}
              onChange={e=>setForm(f=>({ ...f, allowSingle:e.target.checked }))} />
            <label htmlFor="allow" className="text-sm text-gray-900">Permitir que alguien quede solo si hay impar</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900">Modo de revelación</label>
            <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={form.revealMode} onChange={e=>setForm(f=>({ ...f, revealMode:e.target.value as any }))}>
              <option value="on_date">Mostrar en la fecha del evento</option>
              <option value="on_lock">Mostrar al sellar la mezcla</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button disabled={creating}
              className={`rounded-lg px-4 py-2 text-white ${creating ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"}`}>
              {creating ? "Creando…" : "Crear evento"}
            </button>
          </div>
        </form>
      </div>

      {/* MIS EVENTOS */}
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Mis eventos</h2>
        {events.length === 0 ? (
          <p className="opacity-80">Aún no has creado eventos.</p>
        ) : (
          <div className="grid gap-3">
            {events.map(e=>(
              <button key={e.id}
                onClick={()=>setSelectedId(e.id)}
                className={`text-left p-4 border rounded-lg bg-white transition
                  ${selectedId===e.id ? "ring-2 ring-red-500" : "hover:bg-gray-50"}`}>
                <div className="font-semibold text-gray-900">{e.name}</div>
                <div className="text-sm text-gray-700">
                  Código: {e.code} · Estado: {e.status} · Presupuesto: ₡{Number(e.budget_max).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MEZCLA */}
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-900">Mezcla</h2>
          {!!selected && <span className="text-sm text-gray-700">Evento: <b className="text-gray-900">{selected.name}</b> ({selected.code})</span>}
        </div>
        {!selected && <p className="opacity-80">Selecciona un evento para ver su estado.</p>}

        {selected && summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
              <div className="rounded border p-3 bg-white"><b className="text-gray-900">Estado</b><div>{summary.status}</div></div>
              <div className="rounded border p-3 bg-white"><b className="text-gray-900">Participantes</b><div>{summary.participants}</div></div>
              <div className="rounded border p-3 bg-white"><b className="text-gray-900">Parejas</b><div>{summary.pairs}</div></div>
              <div className="rounded border p-3 bg-white"><b className="text-gray-900">Solos</b><div>{summary.singles}</div></div>
              <div className="rounded border p-3 bg-white"><b className="text-gray-900">Permitir solo</b><div>{summary.allow_single ? "Sí" : "No"}</div></div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button disabled={!(summary.status==="draft")}
                onClick={()=>doCall(`/api/admin/events/${selected.id}/pairing/generate`)}
                className={`px-4 py-2 rounded text-white ${summary.status==="draft" ? "bg-black hover:opacity-90" : "bg-gray-400 cursor-not-allowed"}`}>
                Generar / Regenerar
              </button>
              <button disabled={!(summary.status==="draft")}
                onClick={()=>doCall(`/api/admin/events/${selected.id}/pairing/lock`)}
                className={`px-4 py-2 rounded text-white ${summary.status==="draft" ? "bg-emerald-600 hover:opacity-90" : "bg-gray-400 cursor-not-allowed"}`}>
                Sellar mezcla
              </button>
              <button disabled={(summary.status==="draft")}
                onClick={()=>doCall(`/api/admin/events/${selected.id}/pairing/unlock`)}
                className={`px-4 py-2 rounded text-white ${summary.status!=="draft" ? "bg-amber-600 hover:opacity-90" : "bg-gray-400 cursor-not-allowed"}`}>
                Desbloquear
              </button>
            </div>
          </>
        )}
      </div>

      {/* PARTICIPANTES */}
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Participantes</h2>
        {!selected && <p className="opacity-80">Selecciona un evento.</p>}
        {selected && (
          <div className="rounded border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-gray-900">Alias</th>
                  <th className="text-left p-2 text-gray-900">ID Público</th>
                  <th className="text-left p-2 text-gray-900">Registro</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p:any)=>(
                  <tr key={p.public_id} className="border-t">
                    <td className="p-2 text-gray-900">{p.alias}</td>
                    <td className="p-2 font-mono text-gray-900">{p.public_id}</td>
                    <td className="p-2 text-gray-700">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {parts.length === 0 && (
                  <tr><td className="p-3 opacity-60" colSpan={3}>Aún no hay participantes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
