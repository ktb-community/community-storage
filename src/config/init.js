require('dotenv').config({path: './.env'})

/* 필요한 환경변수 목록 점검 */
const requiredEnvVars = ['ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'BUCKET_NAME', 'REGION', 'PORT', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PORT'];

requiredEnvVars.forEach((env) => {
    if (!process.env[env]) {
        console.error(`Missing required environment variable: ${env}`);
        process.exit(1);
    }
});

require("./db");
