# mudaFacil — Sistema de Gerenciamento de Empresa de Mudanças

Aplicação web completa (CRUD de Empresas, Clientes, Cidades, Funcionários,
Serviços e Pedidos) com **React + TypeScript + Tailwind + shadcn/ui** no
frontend, **Node.js + Express** no backend e **PostgreSQL** como banco de dados.

Todas as regras de cálculo (preço do item e total do pedido) continuam sendo
executadas por **triggers do PostgreSQL** — nunca no frontend nem no backend.

---

## Estrutura do projeto

```
mudaFacil/
  src/            # frontend (React + TanStack Router/Query)
  backend/        # API REST (Express + pg)
  database/       # schema.sql e seed.sql
  docker/         # config do pgAdmin
  docker-compose.yml
  README.md
```

> O frontend fica na raiz do repositório (`src/`, `package.json`, `vite.config.ts`),
> pois é assim que a ferramenta de build/preview do projeto o espera. Os comandos
> `cd frontend` do enunciado equivalem a executar na **raiz** do projeto.

---

## Requisitos

| Ferramenta     | Versão recomendada |
| -------------- | ------------------ |
| Docker Desktop | qualquer recente   |

Para rodar **sem Docker** (alternativa): PostgreSQL 14+, Node.js 20+ e npm 9+.

---

## Como executar (recomendado: Docker)

### 1. Clonar o repositório

```bash
git clone <repositorio>
cd mudaFacil
```

### 2. Subir tudo

```bash
docker compose up --build
```

Na primeira execução o Docker baixa as imagens, cria o banco, aplica `schema.sql` + `seed.sql` e sobe a API, o frontend e o pgAdmin.

| Serviço    | URL / porta              |
| ---------- | ------------------------ |
| Frontend   | http://localhost:8080    |
| API        | http://localhost:3001    |
| pgAdmin    | http://localhost:5050    |
| PostgreSQL | localhost:5432           |

**pgAdmin (pelo navegador — não use o pgAdmin instalado com o PostgreSQL)**

- URL: http://localhost:5050
- Login: `admin@mudafacil.com` / `admin`
- O servidor **mudaFacil** já vem cadastrado e conectado
- Caminho das tabelas: `Servers → mudaFacil → Databases → mudafacil → Schemas → public → Tables`

Para parar: `Ctrl+C` (ou `docker compose down`).  
Para apagar o banco e recomeçar do zero: `docker compose down -v`.

> Se a porta 5432 já estiver em uso (Postgres local), pare o serviço local ou altere o mapeamento em `docker-compose.yml` (ex.: `"5433:5432"`).

---

## Como executar sem Docker

### 1. Criar o banco de dados

```bash
createdb mudafacil
psql -d mudafacil -f database/schema.sql
psql -d mudafacil -f database/seed.sql
```

`schema.sql` cria tabelas, chaves, constraints, funções e triggers.
`seed.sql` insere dados de exemplo para testar todas as telas.

### 2. Subir o backend (porta 3001)

```bash
cd backend
cp .env.example .env      # ajuste usuário/senha do PostgreSQL
npm install
npm run dev
```

Conteúdo do `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mudafacil
DB_USER=postgres
DB_PASSWORD=senha
PORT=3001
```

Teste rápido: `curl http://localhost:3001/health` → `{"status":"ok"}`.

### 3. Subir o frontend (porta 8080)

```bash
cd ..            # raiz do projeto (pasta "frontend" do enunciado)
npm install
npm run dev
```

Acesse **http://localhost:8080**.

Se o backend estiver em outra porta/host, crie um `.env` na raiz com:

```env
VITE_API_URL=http://localhost:3001
```

---

## Portas utilizadas

| Serviço    | Porta |
| ---------- | ----- |
| PostgreSQL | 5432  |
| Backend    | 3001  |
| Frontend   | 8080  |
| pgAdmin    | 5050  |

---

## Estrutura do banco de dados

### Tabelas

| Tabela              | Descrição                                                    |
| ------------------- | ------------------------------------------------------------ |
| `cidades`           | Cidades (nome, estado com 2 letras)                            |
| `empresas`          | Empresas de mudança                                            |
| `telefones_empresa` | Telefones da empresa (1:N, `ON DELETE CASCADE`)                |
| `clientes`          | Clientes (CPF único, cidade opcional)                          |
| `telefones_cliente` | Telefones do cliente (1:N, `ON DELETE CASCADE`)                |
| `funcionarios`      | Funcionários (PK = CPF), vinculados a uma empresa              |
| `servicos`          | Generalização de serviços (`preco_hora`, `tipo`)               |
| `guindastes`        | Especialização de serviço (tamanho da base, altura, bônus)     |
| `transportes`       | Especialização de serviço (limite de carga, % de acréscimo)    |
| `oferecem`          | N:N entre empresas e serviços                                  |
| `pedidos`           | Pedido de mudança (cliente, empresa, funcionário, rotas)       |
| `itens_pedido`      | Serviços contratados no pedido, com preço calculado por trigger |

### Restrições (constraints)

- `clientes_cpf_key` — CPF único
- `oferecem_empresa_id_servico_id_key` — não repete serviço para a mesma empresa
- `chk_salario` — `salario >= 0`
- `chk_preco_hora` — `preco_hora > 0`
- `servicos_tipo_check` — `tipo IN ('GUINDASTE','TRANSPORTE')`
- `chk_tempo` — `tempo_duracao > 0`
- `chk_datas` — `data_resolucao >= data_solicitacao` (ou nula)
- Chaves estrangeiras em todos os relacionamentos, com `ON DELETE CASCADE`
  nos itens dependentes (telefones, itens do pedido, especializações)

### Funções e triggers (regras de negócio no banco)

| Trigger            | Tabela         | Função               | Regra                                                              |
| ------------------ | -------------- | -------------------- | ------------------------------------------------------------------ |
| `tg_guindaste`     | `guindastes`   | `fn_guindaste()`     | Impede que um serviço seja guindaste e transporte; marca o tipo      |
| `tg_transporte`    | `transportes`  | `fn_transporte()`    | Idem, para transporte                                                |
| `tg_calcular_preco`| `itens_pedido` | `fn_calcular_preco()`| `preco = preco_hora * tempo_duracao + acrescimo - bonus`             |
| `tg_total_pedido`  | `itens_pedido` | `fn_total_pedido()`  | `pedidos.preco_total = SUM(itens_pedido.preco)`                      |

---

## API REST

Base: `http://localhost:3001`

Todas as entidades possuem os cinco endpoints padrão:

```
GET    /clientes
GET    /clientes/:id
POST   /clientes
PUT    /clientes/:id
DELETE /clientes/:id
```

Recursos disponíveis: `/cidades`, `/empresas`, `/clientes`, `/funcionarios`,
`/servicos`, `/pedidos`, `/telefones-empresa`, `/telefones-cliente`,
`/guindastes`, `/transportes`, `/oferecem`, `/itens-pedido`.

Extras: `/health` (status da conexão) e `/stats/counts` (contadores do Dashboard).

Os endpoints de `empresas`, `clientes`, `servicos` e `pedidos` aceitam também os
dados filhos (telefones, especialização e itens) e gravam tudo em uma única
transação.

### Organização do backend

```
backend/src/
  config/       # leitura das variáveis de ambiente
  database/     # pool de conexões e transações (pg)
  services/     # SQL de cada entidade
  controllers/  # handlers REST
  routes/       # montagem das rotas
  middleware/   # tratamento de erros do PostgreSQL
```

Erros de constraint e mensagens de `RAISE EXCEPTION` das triggers são
repassados ao frontend e exibidos em toast.

---

## Roteiro de teste

1. **Cidades** — cadastre, edite, pesquise, ordene e exclua.
2. **Empresas** — cadastre com dois telefones; verifique a exclusão em cascata.
3. **Clientes** — CPF duplicado deve retornar erro (constraint `UNIQUE`).
4. **Funcionários** — salário negativo deve ser rejeitado (`chk_salario`).
5. **Serviços** — crie um TRANSPORTE e depois troque para GUINDASTE: o tipo é
   atualizado pelas triggers.
6. **Pedidos** — adicione itens e confira que o preço do item e o total vêm
   calculados do banco.

---

## Erros comuns

| Erro                                                | Causa / solução                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `open //./pipe/dockerDesktopLinuxEngine`             | Abra o **Docker Desktop** e espere ele iniciar                          |
| `Bind for 0.0.0.0:5432 failed`                       | Postgres local ocupando a porta — pare o serviço ou use `"5433:5432"`   |
| `Não foi possível conectar à API em http://...`      | O backend não está rodando (`docker compose up` ou `cd backend && npm run dev`) |
| `password authentication failed for user "postgres"` | Ajuste `DB_USER`/`DB_PASSWORD` em `backend/.env`                          |
| `database "mudafacil" does not exist`                | Execute `createdb mudafacil` (só no modo sem Docker)                     |
| `relation "clientes" does not exist`                 | Rode o `schema.sql` (ou `docker compose down -v && docker compose up`)   |
| `EADDRINUSE :3001`                                   | Porta ocupada — altere `PORT` no `.env` e `VITE_API_URL` no frontend      |
| Telas vazias sem erro                                | Rode o `database/seed.sql` (ou reinicie o volume Docker)                 |