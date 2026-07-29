const { Router } = require('express');
const { createCrudController } = require('../controllers/crud.controller');

// Monta GET /, GET /:id, POST /, PUT /:id, DELETE /:id
function createCrudRouter(service, entityName) {
  const router = Router();
  const controller = createCrudController(service, entityName);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = { createCrudRouter };