// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { username: { label: "Usuario", type: "text" },
                     password: { label: "Contraseña", type: "password" } },
      authorize: async (creds) => {
        if (!creds?.username || !creds?.password) return null;
        const conn = await pool.getConnection();
        try {
          const rows = await conn.query(
            "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
            [creds.username]
          );
          const user = rows?.[0];
          if (!user) return null;
          const ok = await bcrypt.compare(creds.password, user.password_hash);
          if (!ok) return null;
          return { id: String(user.id), name: user.username, role: user.role };
        } finally {
          conn.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { // @ts-ignore
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user.id = token.sub as string;
      // @ts-ignore
      session.user.role = (token as any).role as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
