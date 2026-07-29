const { query } = require('../database/pool');

const SELECT = 'SELECT id, nome, estado FROM cidades';

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY nome`);
  return rows;
}

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ nome, estado }) {
  const { rows } = await query(
    'INSERT INTO cidades (nome, estado) VALUES ($1, $2) RETURNING id, nome, estado',
    [nome, estado],
  );
  return rows[0];
}

async function update(id, { nome, estado }) {
  const { rows } = await query(
    'UPDATE cidades SET nome = $1, estado = $2 WHERE id = $3 RETURNING id, nome, estado',
    [nome, estado, id],
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM cidades WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, getById, create, update, remove };