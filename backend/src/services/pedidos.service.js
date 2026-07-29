const { query, withTransaction } = require('../database/pool');

const SELECT = `
  SELECT p.codigo, p.cliente_id, p.empresa_id, p.funcionario_cpf,
         p.cidade_partida, p.cidade_destino, p.endereco_partida, p.endereco_destino,
         p.data_solicitacao, p.data_resolucao, p.aceito, p.preco_total,
         CASE WHEN c.codigo IS NULL THEN NULL
              ELSE json_build_object('codigo', c.codigo, 'nome', c.nome) END AS clientes,
         CASE WHEN e.id IS NULL THEN NULL
              ELSE json_build_object('id', e.id, 'nome', e.nome) END AS empresas,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', i.id, 'servico_id', i.servico_id, 'tempo_duracao', i.tempo_duracao,
                    'acrescimo', i.acrescimo, 'bonus', i.bonus, 'preco', i.preco,
                    'data_fim', i.data_fim,
                    'servicos', CASE WHEN s.id IS NULL THEN NULL
                                     ELSE json_build_object('id', s.id, 'nome', s.nome) END
                  ) ORDER BY i.id)
           FROM itens_pedido i
           LEFT JOIN servicos s ON s.id = i.servico_id
           WHERE i.pedido_id = p.codigo
         ), '[]'::json) AS itens_pedido
  FROM pedidos p
  LEFT JOIN clientes c ON c.codigo = p.cliente_id
  LEFT JOIN empresas e ON e.id = p.empresa_id`;

async function list() {
  const { rows } = await query(`${SELECT} ORDER BY p.codigo DESC`);
  return rows;
}

async function getById(codigo) {
  const { rows } = await query(`${SELECT} WHERE p.codigo = $1`, [codigo]);
  return rows[0] || null;
}

function pedidoParams(b) {
  return [
    b.cliente_id,
    b.empresa_id,
    b.funcionario_cpf ?? null,
    b.endereco_partida ?? null,
    b.endereco_destino ?? null,
    b.cidade_partida ?? null,
    b.cidade_destino ?? null,
    b.data_solicitacao ?? null,
    b.data_resolucao ?? null,
    b.aceito ?? false,
  ];
}

// Os precos dos itens e o preco_total sao calculados pelas triggers
// tg_calcular_preco e tg_total_pedido - nunca no backend.
async function insertItens(client, codigo, itens) {
  for (const item of itens) {
    await client.query(
      `INSERT INTO itens_pedido (pedido_id, servico_id, tempo_duracao, acrescimo, bonus, data_fim)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [codigo, item.servico_id, item.tempo_duracao ?? null, item.acrescimo ?? 0, item.bonus ?? 0, item.data_fim ?? null],
    );
  }
}

async function create(body) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO pedidos (cliente_id, empresa_id, funcionario_cpf, endereco_partida, endereco_destino,
                            cidade_partida, cidade_destino, data_solicitacao, data_resolucao, aceito)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING codigo`,
      pedidoParams(body),
    );
    const codigo = rows[0].codigo;
    await insertItens(client, codigo, body.itens ?? []);
    return getById(codigo);
  });
}

async function update(codigo, body) {
  return withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE pedidos SET cliente_id = $1, empresa_id = $2, funcionario_cpf = $3,
              endereco_partida = $4, endereco_destino = $5, cidade_partida = $6,
              cidade_destino = $7, data_solicitacao = $8, data_resolucao = $9, aceito = $10
        WHERE codigo = $11`,
      [...pedidoParams(body), codigo],
    );
    if (rowCount === 0) return null;
    if (Array.isArray(body.itens)) {
      await client.query('DELETE FROM itens_pedido WHERE pedido_id = $1', [codigo]);
      await insertItens(client, codigo, body.itens);
    }
    return getById(codigo);
  });
}

async function remove(codigo) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM itens_pedido WHERE pedido_id = $1', [codigo]);
    const { rowCount } = await client.query('DELETE FROM pedidos WHERE codigo = $1', [codigo]);
    return rowCount > 0;
  });
}

module.exports = { list, getById, create, update, remove };