"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await signIn("credentials", { username: u, password: p, redirect: false, callbackUrl });
    if (res?.ok) router.push(callbackUrl);
    else setErr("Credenciales inválidas");
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">{err}</div>}
      <form className="space-y-3" onSubmit={onSubmit}>
        <input className="w-full border p-2 rounded" placeholder="Usuario" value={u} onChange={e=>setU(e.target.value)} />
        <input type="password" className="w-full border p-2 rounded" placeholder="Contraseña" value={p} onChange={e=>setP(e.target.value)} />
        <button className="w-full p-2 rounded bg-black text-white">Entrar</button>
      </form>
    </div>
  );
}
