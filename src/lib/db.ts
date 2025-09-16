// src/lib/db.ts
// Importa el módulo CJS y re-exporta sus miembros para poder usar `import { pool } from "@/lib/db"`
import db from "./db.cjs";
export const pool = (db as any).pool as import("mariadb").Pool;
export const connectDB = (db as any).connectDB as () => Promise<void>;
