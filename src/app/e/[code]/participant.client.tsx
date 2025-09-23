"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ParticipantClient({
  code,
  initial,
}: {
  code: string;
  initial: {
    event: any;
    me: { id: number; alias: string; wishlist: string } | null;
    participants: Array<{ alias: string; created_at: string }>;
    canReveal: boolean;
    myPair: { target_alias: string; target_wishlist: string } | null;
  };
}) {
  const router = useRouter();
  const [me, setMe] = useState(initial.me);
  const [alias, setAlias] = useState<string>(initial.me?.alias || "");
  const [wishlist, setWishlist] = useState<string>(initial.me?.wishlist || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [participants, setParticipants] = useState(initial.participants);
  const [canReveal, setCanReveal] = useState<boolean>(initial.canReveal);
  const [myPair, setMyPair] = useState<any>(initial.myPair);

  async function join() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/events/${code}/join`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "No se pudo unir");
      await reloadMe();
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/events/${code}/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias, wishlist }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "No se pudo guardar");
      await reloadMe();
    } catch (e: any) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function reloadMe() {
    const r = await fetch(`/api/events/${code}/me`, { cache: "no-store" });
    const j = await r.json();
    setMe(j.me);
    setAlias(j.me?.alias || "");
    setWishlist(j.me?.wishlist || "");
    setParticipants(j.participants || []);
    setCanReveal(!!j.canReveal);
    setMyPair(j.myPair || null);
    router.refresh();
  }

  // ---------- UI helpers ----------
  const Button = ({
    children,
    onClick,
    type,
    disabled,
    loading,
    variant = "primary",
    className = "",
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    variant?: "primary" | "ghost";
    className?: string;
  }) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
    const styles =
      variant === "primary"
        ? "bg-gray-900 text-white hover:opacity-90 focus:ring-gray-900/40"
        : "bg-white/70 text-gray-900 ring-1 ring-gray-200 hover:bg-white focus:ring-gray-300";
    return (
      <button
        type={type ?? "button"}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${base} ${styles} disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  };

  const Card = ({ children, title, subtitle, icon }: { children: React.ReactNode; title: string; subtitle?: string; icon?: string }) => (
    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
      <div className="rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 p-6">
        <div className="flex items-center gap-2">
          {icon && <span className="text-xl" aria-hidden>{icon}</span>}
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-sm text-gray-700">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${props.className ?? ""}`}
    />
  );

  const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${props.className ?? ""}`}
    />
  );

  const Alert = ({ children, type = "error" }: { children: React.ReactNode; type?: "error" | "info" }) => {
    const styles =
      type === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    const icon = type === "error" ? "⚠️" : "ℹ️";
    return (
      <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${styles}`}>
        <span className="mr-2" aria-hidden>{icon}</span>
        {children}
      </div>
    );
  };

  const pairBox = myPair && canReveal && me && (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="text-sm text-emerald-800">Te tocó con</div>
      <div className="mt-1 text-2xl font-semibold text-emerald-900 flex items-center gap-2">
        <span aria-hidden>🎁</span>{myPair.target_alias}
      </div>
      <div className="mt-3 text-sm">
        <b className="text-emerald-900">Wishlist:</b>
        <pre className="whitespace-pre-wrap mt-1 text-emerald-900/90">
          {myPair.target_wishlist || "Sin preferencias"}
        </pre>
      </div>
    </div>
  );

  return (
    <>
      {/* Estado / Perfil */}
      <Card title="Tu estado" icon="🎄">
        {err && <Alert type="error">{err}</Alert>}

        {!me ? (
          <div className="mt-2">
            <p className="text-sm text-gray-700">Aún no formas parte de este evento.</p>
            <Button onClick={join} loading={loading} className="mt-3">
              {loading ? "Uniendo…" : "Unirme al evento"}
            </Button>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900">Alias público</label>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Tu alias visible"
                maxLength={64}
              />
              <p className="mt-1 text-xs text-gray-500">Sugerencia: sin datos personales, estilo “RenoVeloz” 🦌</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900">Wishlist</label>
              <TextArea
                rows={5}
                value={wishlist}
                onChange={(e) => setWishlist(e.target.value)}
                placeholder="Ideas de regalos, tallas, alergias, tiendas favoritas…"
              />
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Tip: Lista 3–5 ideas concretas. Ej: “Taza térmica 350 ml, talla M, libros sci-fi”.
                </p>
                <span className="text-[11px] text-gray-400">{wishlist.length}/1000</span>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" loading={loading}>
                {loading ? "Guardando…" : "Guardar cambios"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setAlias(initial.me?.alias || ""); setWishlist(initial.me?.wishlist || ""); }}
              >
                Deshacer
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Amigo secreto */}
      <Card title="Tu amigo secreto" icon="🧦" subtitle={!me ? undefined : !canReveal ? (
        <>
          Aún no se puede revelar. Espera a que{" "}
          {initial.event.reveal_mode === "on_lock"
            ? "el organizador selle la mezcla"
            : "llegue la fecha del evento"}
          .
        </>
      ) : undefined}>
        {!me && <p className="text-gray-700">Primero únete al evento.</p>}
        {me && !canReveal && (
          <Alert type="info">
            Paciencia… ¡la magia navideña llega pronto! ✨
          </Alert>
        )}
        {pairBox}
      </Card>

      {/* Participantes */}
      <Card title="Participantes" icon="🗓️" subtitle="Personas unidas al evento.">
        <div className="rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left p-3 text-gray-900 font-medium">Alias</th>
                <th className="text-left p-3 text-gray-900 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p: any, idx: number) => {
                const initial = (p.alias?.trim?.()[0] || "?").toUpperCase();
                return (
                  <tr key={idx} className="border-t hover:bg-gray-50/60 transition">
                    <td className="p-3 text-gray-900">
                      <div className="flex items-center gap-3">
                        <span className="grid place-items-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold">
                          {initial}
                        </span>
                        <span className="truncate">{p.alias}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-700">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-700" colSpan={2}>
                    Aún no hay participantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
