const { Router } = require('express');
const { createCrudRouter } = require('./crud.router');
const { createGenericService } = require('../services/generic.service');
const { query } = require('../database/pool');
const { asyncHandler } = require('../middleware/error-handler');

const cidades = require('../services/cidades.service');
const empresas = require('../services/empresas.service');
const clientes = require('../services/clientes.service');
const funcionarios = require('../services/funcionarios.service');
const servicos = require('../services/servicos.service');
const pedidos = require('../services/pedidos.service');

const telefonesEmpresa = createGenericService({
  table: 'telefones_empresa', pk: 'id', columns: ['empresa_id', 'telefone'],
});
const telefonesCliente = createGenericService({
  table: 'telefones_cliente', pk: 'id', columns: ['cliente_id', 'telefone'],
});
const guindastes = createGenericService({
  table: 'guindastes', pk: 'servico_id', columns: ['servico_id', 'tamanho_base', 'altura', 'bonus'],
});
const transportes = createGenericService({
  table: 'transportes', pk: 'servico_id', columns: ['servico_id', 'limite_carga', 'percentual_acrescimo'],
});
const oferecem = createGenericService({
  table: 'oferecem', pk: 'id', columns: ['empresa_id', 'servico_id'],
});
const itensPedido = createGenericService({
  table: 'itens_pedido', pk: 'id',
  // 'preco' nao entra: e' calculado pela trigger tg_calcular_preco
  columns: ['pedido_id', 'servico_id', 'tempo_duracao', 'acrescimo', 'bonus', 'data_fim'],
});

const router = Router();

router.get('/health', asyncHandler(async (_req, res) => {
  await query('SELECT 1');
  res.json({ status: 'ok' });
}));

// Contadores usados pelo Dashboard
router.get('/stats/counts', asyncHandler(async (_req, res) => {
  const { rows } = await query(`
    SELECT
      (SELECT count(*) FROM empresas)     AS empresas,
      (SELECT count(*) FROM clientes)     AS clientes,
      (SELECT count(*) FROM cidades)      AS cidades,
      (SELECT count(*) FROM funcionarios) AS funcionarios,
      (SELECT count(*) FROM servicos)     AS servicos,
      (SELECT count(*) FROM pedidos)      AS pedidos
  `);
  const r = rows[0];
  res.json({
    empresas: Number(r.empresas),
    clientes: Number(r.clientes),
    cidades: Number(r.cidades),
    funcionarios: Number(r.funcionarios),
    servicos: Number(r.servicos),
    pedidos: Number(r.pedidos),
  });
}));

router.use('/cidades', createCrudRouter(cidades, 'Cidade'));
router.use('/empresas', createCrudRouter(empresas, 'Empresa'));
router.use('/clientes', createCrudRouter(clientes, 'Cliente'));
router.use('/funcionarios', createCrudRouter(funcionarios, 'Funcionário'));
router.use('/servicos', createCrudRouter(servicos, 'Serviço'));
router.use('/pedidos', createCrudRouter(pedidos, 'Pedido'));
router.use('/telefones-empresa', createCrudRouter(telefonesEmpresa, 'Telefone da empresa'));
router.use('/telefones-cliente', createCrudRouter(telefonesCliente, 'Telefone do cliente'));
router.use('/guindastes', createCrudRouter(guindastes, 'Guindaste'));
router.use('/transportes', createCrudRouter(transportes, 'Transporte'));
router.use('/oferecem', createCrudRouter(oferecem, 'Oferecimento'));
router.use('/itens-pedido', createCrudRouter(itensPedido, 'Item do pedido'));

module.exports = router;