// src/lib/db.cjs
const mariadb = require('mariadb');

// OJO: como lo tienes escrito:
// isProduction ? usa 201.191.205.140:4011
// : (else) usa 172.29.132.35:3306
// Ajusta el 0/1 según quieras DEV o PROD.
const isProduction = 1;

const dbConfig = isProduction
  ? { host: '201.191.205.140', port: 4011 } // (tu "prod")
  : { host: '172.29.132.35', port: 3306 };  // (tu "dev")

const pool = mariadb.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: 'root',
  password: 'new_password',
  database: 'BDA',               // ← cambiado a DBA
  connectionLimit: 5,
  allowPublicKeyRetrieval: true, // útil si el server lo requiere
});

console.log(`Conectando a la base de datos en ${dbConfig.host}:${dbConfig.port}`);

async function connectDB() {
  try {
    const conn = await pool.getConnection();
    console.log('Conexión a la base de datos exitosa');
    conn.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    process.exit(1);
  }
}

module.exports = { pool, connectDB };
