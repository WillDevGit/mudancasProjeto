// Converte erros do PostgreSQL em respostas HTTP com mensagem legivel,
// preservando as mensagens levantadas pelas triggers/constraints do banco.
function errorHandler(err, _req, res, _next) {
  const pgCode = err.code;
  let status = 500;

  if (pgCode === '23505') status = 409; // unique_violation
  else if (pgCode === '23503') status = 409; // foreign_key_violation
  else if (pgCode === '23514' || pgCode === '23502') status = 400; // check / not null
  else if (pgCode === 'P0001') status = 400; // RAISE EXCEPTION nas triggers
  else if (err.status) status = err.status;

  const message = err.detail && pgCode === '23505' ? `${err.message} (${err.detail})` : err.message;

  if (status === 500) console.error('[api] erro:', err);

  res.status(status).json({ error: message || 'Erro interno do servidor' });
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

// Envolve handlers async para encaminhar erros ao errorHandler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFoundHandler, asyncHandler };