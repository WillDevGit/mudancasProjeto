const { query } = require('../database/pool');

const SELECT = `
  SELECT f.cpf, f.nome, f.rg, f.endereco, f.telefone, f.salario, f.tipo, f.empresa_id,
         CASE WHEN e.id IS NULL THEN NULL
              ELSE json_build_object('id', e.id, 'nome', e.nome)
         END AS empresas
  FROM funcionarios f
  LEFT JOIN empresas e ON e.id = f.empresa_id`;

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY f.nome`);
  return rows;
}

async function getById(cpf) {
  const { rows } = await query(`${SELECT} WHERE f.cpf = $1`, [cpf]);
  return rows[0] || null;
}

async function create({ cpf, nome = null, rg = null, endereco = null, telefone = null, salario = null, tipo = null, empresa_id = null }) {
  await query(
    `INSERT INTO funcionarios (cpf, nome, rg, endereco, telefone, salario, tipo, empresa_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [cpf, nome, rg, endereco, telefone, salario, tipo, empresa_id],
  );
  return getById(cpf);
}

async function update(cpf, { nome = null, rg = null, endereco = null, telefone = null, salario = null, tipo = null, empresa_id = null }) {
  const { rowCount } = await query(
    `UPDATE funcionarios SET nome = $1, rg = $2, endereco = $3, telefone = $4,
            salario = $5, tipo = $6, empresa_id = $7
      WHERE cpf = $8`,
    [nome, rg, endereco, telefone, salario, tipo, empresa_id, cpf],
  );
  if (rowCount === 0) return null;
  return getById(cpf);
}

async function remove(cpf) {
  const { rowCount } = await query('DELETE FROM funcionarios WHERE cpf = $1', [cpf]);
  return rowCount > 0;
}

module.exports = { list, getById, create, update, remove };