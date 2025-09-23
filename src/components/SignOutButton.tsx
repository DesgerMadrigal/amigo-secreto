// src/components/SignOutButton.tsx
"use client";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg bg-black text-white px-4 py-2"
    >
      Cerrar sesión
    </button>
  );
}
