const pool = require("../config/db");

async function withTransaction(callback) {
    const transaction = await pool.getConnection();

    try {
        await transaction.beginTransaction();
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (err) {
        await transaction.rollback();
        throw err;
    } finally {
        transaction.release();
    }
}

module.exports = withTransaction;