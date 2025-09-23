// src/components/LeaveEventButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LeaveEventButton({
  code,
  locked,
}: {
  code: string;
  locked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLeave() {
    if (locked) return;
    if (!confirm("¿Seguro que quieres salir de este evento?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(code)}/leave`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "No se pudo salir");
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLeave}
      disabled={locked || loading}
      className={`px-3 py-1.5 rounded border ${
        locked || loading
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-red-50 text-red-700 border-red-200"
      }`}
      title={locked ? "Este evento ya está sellado. No puedes salir." : "Salir del evento"}
    >
      {loading ? "Saliendo..." : "Salir"}
    </button>
  );
}
