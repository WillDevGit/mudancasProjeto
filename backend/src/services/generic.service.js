const { query } = require('../database/pool');

// CRUD simples e reutilizavel para as tabelas sem regra de composicao.
function createGenericService({ table, pk, columns, orderBy }) {
  const order = orderBy || pk;

  async function list() {
    const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${order}`);
    return rows;
  }

  async function getById(id) {
    const { rows } = await query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [id]);
    return rows[0] || null;
  }

  async function create(body) {
    const cols = columns.filter((c) => body[c] !== undefined);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      cols.map((c) => body[c]),
    );
    return rows[0];
  }

  async function update(id, body) {
    const cols = columns.filter((c) => body[c] !== undefined);
    if (cols.length === 0) return getById(id);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    const { rows } = await query(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE ${pk} = $${cols.length + 1} RETURNING *`,
      [...cols.map((c) => body[c]), id],
    );
    return rows[0] || null;
  }

  async function remove(id) {
    const { rowCount } = await query(`DELETE FROM ${table} WHERE ${pk} = $1`, [id]);
    return rowCount > 0;
  }

  return { list, getById, create, update, remove };
}

module.exports = { createGenericService };