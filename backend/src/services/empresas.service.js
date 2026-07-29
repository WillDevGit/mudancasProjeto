const { query, withTransaction } = require('../database/pool');

const SELECT = `
  SELECT e.id, e.nome, e.endereco,
         COALESCE((
           SELECT json_agg(json_build_object('id', t.id, 'telefone', t.telefone) ORDER BY t.id)
           FROM telefones_empresa t WHERE t.empresa_id = e.id
         ), '[]'::json) AS telefones_empresa
  FROM empresas e`;

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY e.nome`);
  return rows;
}

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

async function create({ nome, endereco, telefones = [] }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO empresas (nome, endereco) VALUES ($1, $2) RETURNING id',
      [nome, endereco],
    );
    const id = rows[0].id;
    await insertTelefones(client, id, telefones);
    return getById(id);
  });
}

async function update(id, { nome, endereco, telefones }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'UPDATE empresas SET nome = $1, endereco = $2 WHERE id = $3',
      [nome, endereco, id],
    );
    if (rowCount === 0) return null;
    if (Array.isArray(telefones)) {
      await client.query('DELETE FROM telefones_empresa WHERE empresa_id = $1', [id]);
      await insertTelefones(client, id, telefones);
    }
    return getById(id);
  });
}

async function insertTelefones(client, empresaId, telefones) {
  for (const telefone of telefones) {
    const value = typeof telefone === 'string' ? telefone : telefone.telefone;
    if (!value) continue;
    await client.query(
      'INSERT INTO telefones_empresa (empresa_id, telefone) VALUES ($1, $2)',
      [empresaId, value],
    );
  }
}

async function remove(id) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM telefones_empresa WHERE empresa_id = $1', [id]);
    const { rowCount } = await client.query('DELETE FROM empresas WHERE id = $1', [id]);
    return rowCount > 0;
  });
}

module.exports = { list, getById, create, update, remove };