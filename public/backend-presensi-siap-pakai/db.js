const mysql = require('mysql2/promise');
require('dotenv').config();

// Membuat koneksi kumpulan (Connection Pool) agar server cepat dan stabil
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_presensi_pkl',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Tes apakah koneksi ke MySQL berhasil
db.getConnection()
  .then((conn) => {
    console.log('====================================================');
    console.log('✅ BERHASIL TERHUBUNG KE DATABASE MYSQL (db_presensi_pkl)!');
    console.log('====================================================');
    conn.release();
  })
  .catch((err) => {
    console.log('====================================================');
    console.error('❌ GAGAL KONEK KE MYSQL! Periksa apakah XAMPP sudah Start:', err.message);
    console.log('====================================================');
  });

module.exports = db;
