const mysql = require("mysql2");

// MySQL 연결 풀 생성
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    keepAliveInitialDelay: 10000, // 0 by default.
    enableKeepAlive: true // false by default.
});

// Promise 기반 사용을 위한 `promise()` 호출
const db = pool.promise();

// 초기 연결 테스트
db.getConnection()
    .then(conn => {
        conn.release();
        console.log(`Successfully Connected to DB: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT} with ${process.env.DB_USER}`);
    })
    .catch(err => {
        console.error("Connection Error: ", err);
        process.exit(1);
    })

module.exports = db;