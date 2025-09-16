"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const sp = useSearchParams();
  const eventCode = sp.get("eventCode") || "";
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", alias: "", wishlist: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventCode }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setErr(j?.error || "Error");
      return;
    }
    router.push("/login");
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      {eventCode && <p className="text-sm opacity-80">Te unirás al evento: <b>{eventCode}</b></p>}
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{String(err)}</div>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border p-2 rounded" placeholder="Usuario" value={form.username}
          onChange={e=>setForm(f=>({ ...f, username:e.target.value }))} />
        <input type="password" className="w-full border p-2 rounded" placeholder="Contraseña" value={form.password}
          onChange={e=>setForm(f=>({ ...f, password:e.target.value }))} />
        <input className="w-full border p-2 rounded" placeholder="Alias público" value={form.alias}
          onChange={e=>setForm(f=>({ ...f, alias:e.target.value }))} />
        <textarea className="w-full border p-2 rounded" placeholder="Wishlist (opcional)" rows={5} value={form.wishlist}
          onChange={e=>setForm(f=>({ ...f, wishlist:e.target.value }))} />
        <button disabled={loading} className="w-full p-2 rounded bg-black text-white">
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
