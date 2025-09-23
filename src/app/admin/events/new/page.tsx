// src/app/admin/events/new/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "", name: "",
    dateLocal: "", // <input type="datetime-local">
    tz: "America/Costa_Rica",
    budgetMax: 0,
    allowSingle: true,
    revealMode: "on_date" as "on_date"|"on_lock",
  });
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  function toDateUTCString(dtLocal: string) {
    // datetime-local → "YYYY-MM-DD HH:mm:ss" UTC
    if (!dtLocal) return "";
    const d = new Date(dtLocal);
    const pad = (n:number)=>String(n).padStart(2,"0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setLoading(true);
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
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j?.error ? JSON.stringify(j.error) : "Error creando evento");
      }
      router.replace("/admin/events");
    } catch (e:any) {
      setErr(e.message || "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nuevo evento</h1>
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{err}</div>}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium">Código (único)</label>
          <input className="w-full border rounded p-2" value={form.code}
            onChange={e=>setForm(f=>({ ...f, code:e.target.value }))} placeholder="XMAS2025" />
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input className="w-full border rounded p-2" value={form.name}
            onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} placeholder="Intercambio Navideño" />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha y hora (tu zona)</label>
          <input type="datetime-local" className="w-full border rounded p-2" value={form.dateLocal}
            onChange={e=>setForm(f=>({ ...f, dateLocal:e.target.value }))}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Zona horaria</label>
            <input className="w-full border rounded p-2" value={form.tz}
              onChange={e=>setForm(f=>({ ...f, tz:e.target.value }))}/>
          </div>
          <div>
            <label className="block text-sm font-medium">Presupuesto máx</label>
            <input type="number" className="w-full border rounded p-2" value={form.budgetMax}
              onChange={e=>setForm(f=>({ ...f, budgetMax:e.target.value as any }))}/>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.allowSingle}
              onChange={e=>setForm(f=>({ ...f, allowSingle:e.target.checked }))}/>
            Permitir que alguien quede solo si hay impar
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium">Modo de revelación</label>
          <select className="w-full border rounded p-2" value={form.revealMode}
            onChange={e=>setForm(f=>({ ...f, revealMode:e.target.value as any }))}>
            <option value="on_date">Mostrar en la fecha del evento</option>
            <option value="on_lock">Mostrar al sellar la mezcla</option>
          </select>
        </div>
        <button disabled={loading} className="rounded bg-black text-white px-4 py-2">
          {loading ? "Creando..." : "Crear evento"}
        </button>
      </form>
    </div>
  );
}
