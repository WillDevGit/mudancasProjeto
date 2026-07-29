const { query, withTransaction } = require('../database/pool');

const SELECT = `
  SELECT s.id, s.nome, s.preco_hora, s.tipo,
         CASE WHEN g.servico_id IS NULL THEN NULL
              ELSE json_build_object('tamanho_base', g.tamanho_base, 'altura', g.altura, 'bonus', g.bonus)
         END AS guindastes,
         CASE WHEN t.servico_id IS NULL THEN NULL
              ELSE json_build_object('limite_carga', t.limite_carga, 'percentual_acrescimo', t.percentual_acrescimo)
         END AS transportes
  FROM servicos s
  LEFT JOIN guindastes  g ON g.servico_id = s.id
  LEFT JOIN transportes t ON t.servico_id = s.id`;

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY s.nome`);
  return rows;
}

async function getById(id) {
  const { rows } = await query(`${SELECT} WHERE s.id = $1`, [id]);
  return rows[0] || null;
}

// A especializacao (GUINDASTE/TRANSPORTE) e' aplicada pelas triggers
// tg_guindaste / tg_transporte, que tambem preenchem servicos.tipo.
async function saveEspecializacao(client, id, body) {
  if (body.tipo === 'GUINDASTE') {
    await client.query(
      'INSERT INTO guindastes (servico_id, tamanho_base, altura, bonus) VALUES ($1,$2,$3,$4)',
      [id, body.tamanho_base ?? null, body.altura ?? null, body.bonus ?? null],
    );
  } else if (body.tipo === 'TRANSPORTE') {
    await client.query(
      'INSERT INTO transportes (servico_id, limite_carga, percentual_acrescimo) VALUES ($1,$2,$3)',
      [id, body.limite_carga ?? null, body.percentual_acrescimo ?? null],
    );
  }
}

async function create(body) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO servicos (nome, preco_hora) VALUES ($1,$2) RETURNING id',
      [body.nome ?? null, body.preco_hora],
    );
    const id = rows[0].id;
    await saveEspecializacao(client, id, body);
    return getById(id);
  });
}

async function update(id, body) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      'UPDATE servicos SET nome = $1, preco_hora = $2 WHERE id = $3',
      [body.nome ?? null, body.preco_hora, id],
    );
    if (rowCount === 0) return null;
    if (body.tipo) {
      // remove a especializacao anterior antes de aplicar a nova
      await client.query('DELETE FROM guindastes WHERE servico_id = $1', [id]);
      await client.query('DELETE FROM transportes WHERE servico_id = $1', [id]);
      await saveEspecializacao(client, id, body);
    }
    return getById(id);
  });
}

async function remove(id) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM guindastes WHERE servico_id = $1', [id]);
    await client.query('DELETE FROM transportes WHERE servico_id = $1', [id]);
    const { rowCount } = await client.query('DELETE FROM servicos WHERE id = $1', [id]);
    return rowCount > 0;
  });
}

module.exports = { list, getById, create, update, remove };