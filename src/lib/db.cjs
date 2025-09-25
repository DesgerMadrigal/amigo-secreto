// src/lib/db.cjs
const mariadb = require('mariadb');

/**
 * Soporta dos formas de configuración:
 * 1) Variables sueltas: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
 * 2) Una URL completa tipo Coolify: MARIADB_URL o DATABASE_URL
 *    ej: mysql://user:pass@host:3306/BDA
 */
function fromUrl(url) {
  try {
    // MariaDB/MySQL URL -> parse con URL (hack: usar http para parsear)
    const u = new URL(url.replace(/^mysql:\/\//, 'http://'));
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '') || 'BDA',
    };
  } catch {
    return null;
  }
}

const urlCfg =
  fromUrl(process.env.MARIADB_URL || process.env.DATABASE_URL || '') || null;

const host = (urlCfg?.host) || process.env.DB_HOST || '127.0.0.1';
const port = Number((urlCfg?.port) || process.env.DB_PORT || 3306);
const user = (urlCfg?.user) || process.env.DB_USER || 'root';
const password = (urlCfg?.password) || process.env.DB_PASS || '';
const database = (urlCfg?.database) || process.env.DB_NAME || 'BDA';

const pool = mariadb.createPool({
  host,
  port,
  user,
  password,
  database,
  connectionLimit: 8,
  connectTimeout: 15000,
  allowPublicKeyRetrieval: true,
  compress: true,
  bigIntAsNumber: true, // tus ids int(11) están ok como Number
});

console.log(`[db] MariaDB pool -> ${host}:${port} db=${database}`);

async function connectDB() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    console.log('[db] ping OK');
  } catch (error) {
    console.error('[db] ping FAIL:', error?.message || error);
    // No hacemos process.exit(1) para no tumbar el runtime de Next
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, connectDB };
