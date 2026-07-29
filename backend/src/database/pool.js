const { Pool, types } = require('pg');
const { db } = require('../config/env');

// PostgREST devolvia numeric como number e date como string 'YYYY-MM-DD'.
// Mantemos o mesmo formato para nao alterar o comportamento do frontend.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
types.setTypeParser(1082, (v) => v); // date

const pool = new Pool(db);

pool.on('error', (err) => {
  console.error('[pg] erro inesperado no pool:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

// Executa um conjunto de comandos numa unica transacao.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };