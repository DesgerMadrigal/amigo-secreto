// src/lib/db.cjs
const mariadb = require('mariadb');

// 1 = usar 201.191.205.140:4011 ; 0 = usar 172.29.132.35:3306
const isProduction = 1;

const dbConfig = isProduction
  ? { host: '201.191.205.140', port: 4011 }
  : { host: '172.29.132.35', port: 3306 };

const pool = mariadb.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: 'root',
  password: 'new_password',
  database: 'BDA',
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
  bigIntAsNumber: true, // <-- evita BigInt en respuestas
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
