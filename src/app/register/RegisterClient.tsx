//src/app/register/page.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // Si viene por query lo prellenamos, pero ahora es obligatorio
  const [form, setForm] = useState({
    alias: "",
    password: "",
    wishlist: "",
    eventCode: sp.get("eventCode") || "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(
    () =>
      loading ||
      !form.alias.trim() ||
      !form.password.trim() ||
      form.password.length < 8 ||
      !form.eventCode.trim(),
    [loading, form]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      // username = alias (clave del cambio)
      const payload = {
        username: form.alias.trim(),
        alias: form.alias.trim(),
        password: form.password,
        wishlist: form.wishlist,
        eventCode: form.eventCode.trim(),
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Ocurrió un error al crear la cuenta");

      // auto-login
      const si = await signIn("credentials", {
        username: payload.username,
        password: payload.password,
        redirect: false,
      });
      if (!si?.ok) throw new Error("No fue posible iniciar sesión automáticamente");

      // redirigir directo al evento (obligatorio)
      router.replace(`/e/${payload.eventCode}`);
    } catch (error: any) {
      setErr(error.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Fondo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_10%_10%,rgba(220,38,38,0.18),transparent_60%),radial-gradient(70%_60%_at_90%_90%,rgba(16,185,129,0.18),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[length:18px_18px]" />

      <main className="min-h-screen grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand pill */}
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow">
              <span aria-hidden>🎄</span> Amigo Secreto
            </span>
          </div>

          <div className="rounded-2xl bg-white/85 backdrop-blur shadow-xl ring-1 ring-black/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 grid place-items-center rounded-full bg-rose-100">🧸</div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta</h1>
                <p className="text-sm text-gray-700">Tu alias será también tu usuario.</p>
              </div>
            </div>

            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {String(err)}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">
                  Alias (también será tu usuario)
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="tu.alias"
                  value={form.alias}
                  onChange={(e) => setForm((f) => ({ ...f, alias: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {showPwd ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">Usa al menos 8 caracteres.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Código de evento</label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="EJ: XMAS2025"
                  value={form.eventCode}
                  onChange={(e) => setForm((f) => ({ ...f, eventCode: e.target.value }))}
                />
                <p className="text-xs text-gray-600">
                  Es obligatorio. Quedarás asociado a este evento.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Wishlist (opcional)</label>
                <textarea
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ideas de regalos, tallas, alergias, tiendas favoritas…"
                  value={form.wishlist}
                  onChange={(e) => setForm((f) => ({ ...f, wishlist: e.target.value }))}
                />
              </div>

              <button
                disabled={isSubmitDisabled}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white shadow-sm transition
                ${isSubmitDisabled ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:bg-red-800"}`}
              >
                {loading ? "Creando…" : "Crear cuenta"}
              </button>

              <p className="text-center text-sm text-gray-700">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-red-700 hover:text-red-800 underline underline-offset-4">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-700">
            © {new Date().getFullYear()} Amigo Secreto
          </p>
        </div>
      </main>
    </div>
  );
}
