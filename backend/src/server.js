const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`[mudaFacil] API ouvindo em http://localhost:${port}`);
});