// src/app/register/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const sp = useSearchParams();
  const eventCode = sp.get("eventCode") || "";
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
    alias: "",
    wishlist: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(
    () =>
      loading ||
      !form.username.trim() ||
      !form.password.trim() ||
      !form.alias.trim(),
    [loading, form]
  );

  function humanizeRegisterError(status?: number, payload?: any) {
    if (status === 409) return "Ese usuario ya existe. Prueba con otro.";
    if (status === 404) return "No encontramos el evento especificado.";
    if (status === 400 && payload?.error?.fieldErrors) {
      return "Hay errores de validación. Revisa los campos.";
    }
    if (payload?.error && typeof payload.error === "string") {
      return payload.error;
    }
    return "Ocurrió un error al crear la cuenta.";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      // 1) Crear usuario (y unirse al evento si eventCode viene en la URL)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventCode }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(humanizeRegisterError(res.status, j));
      }

      // 2) Auto-login con NextAuth (Credentials)
      const sign = await signIn("credentials", {
        username: form.username,
        password: form.password,
        redirect: false,
      });

      if (!sign?.ok) {
        // Si por alguna razón no se pudo loguear, manda al login
        router.replace("/login");
        return;
      }

      // 3) Redirección final
      if (eventCode) {
        router.replace(`/e/${eventCode}`);
      } else {
        router.replace("/dashboard");
      }
    } catch (error: any) {
      setErr(error?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Fondo navideño: rojo/ámbar + verde muy suave */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_10%_10%,rgba(220,38,38,0.18),transparent_60%),radial-gradient(70%_60%_at_90%_90%,rgba(16,185,129,0.18),transparent_60%)]" />
      {/* Copitos muy sutiles */}
      <div className="absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] bg-[length:18px_18px]" />

      {/* Centrado total */}
      <main className="min-h-screen grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand pill */}
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-amber-300 shadow">
              <span aria-hidden>🎄</span> Amigo Secreto
            </span>
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-white/85 backdrop-blur shadow-xl ring-1 ring-black/5 p-6 md:p-8">
            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 grid place-items-center rounded-full bg-rose-100">
                <span aria-hidden>🧸</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Crear cuenta
                </h1>
                <p className="text-sm text-gray-700">
                  Comparte ilusión estas fiestas ✨
                </p>
              </div>
            </div>

            {/* Event code pill */}
            {eventCode && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                    Evento
                  </span>
                  <b className="font-semibold">{eventCode}</b>
                </span>
              </div>
            )}

            {/* Error global */}
            {err && (
              <div
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
                aria-live="polite"
              >
                {String(err)}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-900"
                >
                  Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="tu.usuario"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-900"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-12 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPwd ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">Usa al menos 8 caracteres.</p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="alias"
                  className="block text-sm font-medium text-gray-900"
                >
                  Alias público
                </label>
                <input
                  id="alias"
                  name="alias"
                  autoComplete="nickname"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Cómo quieres que te vean"
                  value={form.alias}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alias: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wishlist"
                  className="block text-sm font-medium text-gray-900"
                >
                  Wishlist (opcional)
                </label>
                <textarea
                  id="wishlist"
                  name="wishlist"
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ideas de regalos, tallas, alergias, tiendas favoritas…"
                  value={form.wishlist}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, wishlist: e.target.value }))
                  }
                />
              </div>

              <button
                disabled={isSubmitDisabled}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-white shadow-sm transition
                ${isSubmitDisabled ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 active:bg-red-800"}`}
              >
                {loading && (
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                  </svg>
                )}
                {loading ? "Creando…" : "Crear cuenta"}
              </button>

              <p className="text-center text-sm text-gray-700">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/login"
                  className="font-medium text-red-700 hover:text-red-800 underline underline-offset-4"
                >
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-700">
            Al registrarte aceptas nuestras normas de convivencia 🎅
          </p>
        </div>
      </main>
    </div>
  );
}
