const { query, withTransaction } = require('../database/pool');

const SELECT = `
  SELECT c.codigo, c.cpf, c.nome, c.rg, c.endereco, c.cidade_id,
         CASE WHEN ci.id IS NULL THEN NULL
              ELSE json_build_object('id', ci.id, 'nome', ci.nome, 'estado', ci.estado)
         END AS cidades,
         COALESCE((
           SELECT json_agg(json_build_object('id', t.id, 'telefone', t.telefone) ORDER BY t.id)
           FROM telefones_cliente t WHERE t.cliente_id = c.codigo
         ), '[]'::json) AS telefones_cliente
  FROM clientes c
  LEFT JOIN cidades ci ON ci.id = c.cidade_id`;

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY c.nome`);
  return rows;
}

async function getById(codigo) {
  const { rows } = await query(`${SELECT} WHERE c.codigo = $1`, [codigo]);
  return rows[0] || null;
}

async function insertTelefones(client, codigo, telefones) {
  for (const telefone of telefones) {
    const value = typeof telefone === 'string' ? telefone : telefone.telefone;
    if (!value) continue;
    await client.query(
      'INSERT INTO telefones_cliente (cliente_id, telefone) VALUES ($1, $2)',
      [codigo, value],
    );
  }
}

async function create({ cpf, nome, rg = null, endereco = null, cidade_id = null, telefones = [] }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO clientes (cpf, nome, rg, endereco, cidade_id) VALUES ($1,$2,$3,$4,$5) RETURNING codigo',
      [cpf, nome, rg, endereco, cidade_id],
    );
    const codigo = rows[0].codigo;
    await insertTelefones(client, codigo, telefones);
    return getById(codigo);
  });
}

async function update(codigo, { cpf, nome, rg = null, endereco = null, cidade_id = null, telefones }) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'UPDATE clientes SET cpf = $1, nome = $2, rg = $3, endereco = $4, cidade_id = $5 WHERE codigo = $6',
      [cpf, nome, rg, endereco, cidade_id, codigo],
    );
    if (rowCount === 0) return null;
    if (Array.isArray(telefones)) {
      await client.query('DELETE FROM telefones_cliente WHERE cliente_id = $1', [codigo]);
      await insertTelefones(client, codigo, telefones);
    }
    return getById(codigo);
  });
}

async function remove(codigo) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM telefones_cliente WHERE cliente_id = $1', [codigo]);
    const { rowCount } = await client.query('DELETE FROM clientes WHERE codigo = $1', [codigo]);
    return rowCount > 0;
  });
}

module.exports = { list, getById, create, update, remove };