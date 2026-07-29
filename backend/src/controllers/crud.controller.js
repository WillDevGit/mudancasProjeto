const { asyncHandler } = require('../middleware/error-handler');

// Gera os 5 handlers REST padrao a partir de um service.
function createCrudController(service, entityName) {
  return {
    list: asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),

    getById: asyncHandler(async (req, res) => {
      const row = await service.getById(req.params.id);
      if (!row) return res.status(404).json({ error: `${entityName} não encontrado` });
      res.json(row);
    }),

    create: asyncHandler(async (req, res) => {
      const row = await service.create(req.body ?? {});
      res.status(201).json(row);
    }),

    update: asyncHandler(async (req, res) => {
      const row = await service.update(req.params.id, req.body ?? {});
      if (!row) return res.status(404).json({ error: `${entityName} não encontrado` });
      res.json(row);
    }),

    remove: asyncHandler(async (req, res) => {
      const ok = await service.remove(req.params.id);
      if (!ok) return res.status(404).json({ error: `${entityName} não encontrado` });
      res.status(204).send();
    }),
  };
}

module.exports = { createCrudController };