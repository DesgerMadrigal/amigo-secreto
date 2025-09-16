import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];
  if (!username || !password) {
    console.log("Uso: pnpm run make:admin <usuario> <contraseña>");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    // crea o eleva a admin
    const [u] = await conn.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (u) {
      await conn.query("UPDATE users SET password_hash=?, role='admin' WHERE id=?", [hash, u.id]);
      console.log("Usuario elevado a admin.");
    } else {
      await conn.query("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", [username, hash]);
      console.log("Admin creado.");
    }
  } finally {
    conn.release();
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
