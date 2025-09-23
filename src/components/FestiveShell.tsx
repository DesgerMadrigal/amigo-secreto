"use client";

import React from "react";

export default function FestiveShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Fondo degradado y patrón sutil */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-rose-50 via-amber-50 to-emerald-50" />
      <div className="absolute inset-0 -z-10 opacity-50 bg-[radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[length:18px_18px]" />
      {/* Borde superior “candy cane” */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-2 bg-[linear-gradient(135deg,#ef4444_25%,#ffffff_25%,#ffffff_50%,#ef4444_50%,#ef4444_75%,#ffffff_75%)] bg-[length:24px_24px]" />

      {children}

      {/* Nieve muy sutil (styled-jsx sólo aquí, en cliente) */}
      <style jsx global>{`
        @keyframes snow {
          0% { transform: translateY(-10vh) translateX(0); opacity: 0; }
          10% { opacity: .6; }
          100% { transform: translateY(110vh) translateX(10vw); opacity: 0; }
        }
        .snowflake {
          position: fixed;
          top: -10vh;
          left: 50%;
          width: 6px; height: 6px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.9);
          box-shadow:
            20vw -5vh 0 1px rgba(255,255,255,0.7),
            -30vw -15vh 0 1px rgba(255,255,255,0.5),
            5vw -25vh 0 1px rgba(255,255,255,0.6),
            -15vw -35vh 0 1px rgba(255,255,255,0.55);
          animation: snow 18s linear infinite;
          pointer-events: none;
          filter: blur(.3px);
          z-index: 10;
        }
      `}</style>
      <div aria-hidden className="snowflake" />
    </div>
  );
}
