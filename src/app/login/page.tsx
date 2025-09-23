"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";

  const [form, setForm] = useState({ username: "", password: "", eventCode: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const disabled = loading || !form.username.trim() || !form.password.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const res = await signIn("credentials", {
        username: form.username,
        password: form.password,
        redirect: false,
      });
      if (!res?.ok) throw new Error(res?.error || "No pudimos iniciar sesión");

      const code = form.eventCode.trim();
      if (code) {
        const j = await fetch(`/api/events/${encodeURIComponent(code)}/join`, { method: "POST" })
          .then(r => r.json().catch(()=>({})));
        if (j?.error) throw new Error(j.error);
        router.replace(`/e/${code}`);
      } else {
        router.replace(callbackUrl);
      }
    } catch (e:any) {
      setErr(e?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_10%_10%,rgba(220,38,38,0.18),transparent_60%),radial-gradient(70%_60%_at_90%_90%,rgba(16,185,129,0.18),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[length:18px_18px]" />

      <main className="min-h-screen grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow">
              <span aria-hidden>🎄</span> Amigo Secreto
            </span>
          </div>

          <div className="rounded-2xl bg-white/85 backdrop-blur shadow-xl ring-1 ring-black/5 p-6 md:p-8">
            <header className="mb-4">
              <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
              <p className="mt-1 text-sm text-gray-700">Accede para ver tus eventos.</p>
            </header>

            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-sm font-medium text-gray-900">Usuario</label>
                <input id="username" autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={form.username}
                  onChange={(e)=>setForm(f=>({...f, username:e.target.value}))}/>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">Contraseña</label>
                <div className="relative">
                  <input id="password" type={showPwd ? "text":"password"} autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    value={form.password}
                    onChange={(e)=>setForm(f=>({...f, password:e.target.value}))}/>
                  <button type="button" onClick={()=>setShowPwd(s=>!s)}
                    className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900">
                    {showPwd ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="eventCode" className="block text-sm font-medium text-gray-900">
                  Código de evento (opcional)
                </label>
                <input id="eventCode"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="EJ: XMAS2025"
                  value={form.eventCode}
                  onChange={(e)=>setForm(f=>({...f, eventCode:e.target.value}))}/>
              </div>

              <button disabled={disabled}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white shadow-sm transition
                ${disabled ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:bg-red-800"}`}>
                {loading ? "Entrando…" : "Entrar"}
              </button>

              <p className="text-center text-sm text-gray-700">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="font-medium text-red-700 hover:text-red-800 underline underline-offset-4">
                  Crear cuenta
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-700">© {new Date().getFullYear()} Amigo Secreto</p>
        </div>
      </main>
    </div>
  );
}
