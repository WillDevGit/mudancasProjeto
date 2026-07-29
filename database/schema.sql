-- ============================================================
-- mudaFacil - Sistema de Gerenciamento de Empresa de Mudancas
-- Estrutura extraida integralmente do banco de producao.
-- Uso: createdb mudafacil && psql -d mudafacil -f database/schema.sql
-- ============================================================

BEGIN;

-- Remove objetos existentes (execucao idempotente)
DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS oferecem CASCADE;
DROP TABLE IF EXISTS transportes CASCADE;
DROP TABLE IF EXISTS guindastes CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS funcionarios CASCADE;
DROP TABLE IF EXISTS telefones_cliente CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS telefones_empresa CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;
DROP TABLE IF EXISTS cidades CASCADE;
DROP FUNCTION IF EXISTS fn_guindaste() CASCADE;
DROP FUNCTION IF EXISTS fn_transporte() CASCADE;
DROP FUNCTION IF EXISTS fn_calcular_preco() CASCADE;
DROP FUNCTION IF EXISTS fn_total_pedido() CASCADE;

-- ------------------------- TABELAS --------------------------

CREATE TABLE cidades (
    id     serial,
    nome   varchar(100) NOT NULL,
    estado char(2)      NOT NULL,
    CONSTRAINT cidades_pkey PRIMARY KEY (id)
);

CREATE TABLE empresas (
    id       serial,
    nome     varchar(100) NOT NULL,
    endereco varchar(200) NOT NULL,
    CONSTRAINT empresas_pkey PRIMARY KEY (id)
);

CREATE TABLE telefones_empresa (
    id         serial,
    empresa_id integer     NOT NULL,
    telefone   varchar(20) NOT NULL,
    CONSTRAINT telefones_empresa_pkey PRIMARY KEY (id),
    CONSTRAINT telefones_empresa_empresa_id_fkey FOREIGN KEY (empresa_id)
        REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE clientes (
    codigo    serial,
    cpf       char(11)     NOT NULL,
    rg        varchar(20),
    nome      varchar(150) NOT NULL,
    endereco  varchar(200),
    cidade_id integer,
    CONSTRAINT clientes_pkey PRIMARY KEY (codigo),
    CONSTRAINT clientes_cpf_key UNIQUE (cpf),
    CONSTRAINT clientes_cidade_id_fkey FOREIGN KEY (cidade_id) REFERENCES cidades(id)
);

CREATE TABLE telefones_cliente (
    id         serial,
    cliente_id integer NOT NULL,
    telefone   varchar(20),
    CONSTRAINT telefones_cliente_pkey PRIMARY KEY (id),
    CONSTRAINT telefones_cliente_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES clientes(codigo) ON DELETE CASCADE
);

CREATE TABLE funcionarios (
    cpf        char(11) NOT NULL,
    rg         varchar(20),
    nome       varchar(150),
    endereco   varchar(200),
    telefone   varchar(20),
    salario    numeric(10,2),
    tipo       varchar(50),
    empresa_id integer,
    CONSTRAINT funcionarios_pkey PRIMARY KEY (cpf),
    CONSTRAINT funcionarios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    CONSTRAINT chk_salario CHECK (salario >= 0)
);

-- Generalizacao: servico e' especializado em GUINDASTE ou TRANSPORTE
CREATE TABLE servicos (
    id         serial,
    nome       varchar(100),
    preco_hora numeric(10,2) NOT NULL,
    tipo       varchar(20),
    CONSTRAINT servicos_pkey PRIMARY KEY (id),
    CONSTRAINT chk_preco_hora CHECK (preco_hora > 0),
    CONSTRAINT servicos_tipo_check CHECK (tipo IN ('GUINDASTE','TRANSPORTE'))
);

CREATE TABLE guindastes (
    servico_id   integer NOT NULL,
    tamanho_base numeric(10,2),
    altura       numeric(10,2),
    bonus        numeric(10,2),
    CONSTRAINT guindastes_pkey PRIMARY KEY (servico_id),
    CONSTRAINT guindastes_servico_id_fkey FOREIGN KEY (servico_id)
        REFERENCES servicos(id) ON DELETE CASCADE
);

CREATE TABLE transportes (
    servico_id           integer NOT NULL,
    limite_carga         numeric(10,2),
    percentual_acrescimo numeric(5,2),
    CONSTRAINT transportes_pkey PRIMARY KEY (servico_id),
    CONSTRAINT transportes_servico_id_fkey FOREIGN KEY (servico_id)
        REFERENCES servicos(id) ON DELETE CASCADE
);

CREATE TABLE oferecem (
    id         serial,
    empresa_id integer NOT NULL,
    servico_id integer NOT NULL,
    CONSTRAINT oferecem_pkey PRIMARY KEY (id),
    CONSTRAINT oferecem_empresa_id_servico_id_key UNIQUE (empresa_id, servico_id),
    CONSTRAINT oferecem_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    CONSTRAINT oferecem_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

CREATE TABLE pedidos (
    codigo           serial,
    cliente_id       integer NOT NULL,
    empresa_id       integer NOT NULL,
    funcionario_cpf  char(11),
    endereco_partida varchar(200),
    endereco_destino varchar(200),
    cidade_partida   integer,
    cidade_destino   integer,
    data_solicitacao date,
    data_resolucao   date,
    aceito           boolean DEFAULT false,
    preco_total      numeric(12,2) DEFAULT 0,
    CONSTRAINT pedidos_pkey PRIMARY KEY (codigo),
    CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(codigo),
    CONSTRAINT pedidos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    CONSTRAINT pedidos_funcionario_cpf_fkey FOREIGN KEY (funcionario_cpf) REFERENCES funcionarios(cpf),
    CONSTRAINT pedidos_cidade_partida_fkey FOREIGN KEY (cidade_partida) REFERENCES cidades(id),
    CONSTRAINT pedidos_cidade_destino_fkey FOREIGN KEY (cidade_destino) REFERENCES cidades(id),
    CONSTRAINT chk_datas CHECK (data_resolucao IS NULL OR data_resolucao >= data_solicitacao)
);

CREATE TABLE itens_pedido (
    id            serial,
    pedido_id     integer NOT NULL,
    servico_id    integer NOT NULL,
    tempo_duracao numeric(6,2),
    acrescimo     numeric(10,2) DEFAULT 0,
    bonus         numeric(10,2) DEFAULT 0,
    preco         numeric(10,2),
    data_fim      date,
    CONSTRAINT itens_pedido_pkey PRIMARY KEY (id),
    CONSTRAINT itens_pedido_pedido_id_fkey FOREIGN KEY (pedido_id)
        REFERENCES pedidos(codigo) ON DELETE CASCADE,
    CONSTRAINT itens_pedido_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES servicos(id),
    CONSTRAINT chk_tempo CHECK (tempo_duracao > 0)
);

-- ------------------ FUNCOES (regras de negocio) -------------

-- Disjuncao da especializacao + marca o tipo do servico
CREATE OR REPLACE FUNCTION fn_guindaste() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM transportes WHERE servico_id = NEW.servico_id) THEN
        RAISE EXCEPTION 'Este serviço já pertence à especialização Transporte.';
    END IF;
    UPDATE servicos SET tipo = 'GUINDASTE' WHERE id = NEW.servico_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_transporte() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM guindastes WHERE servico_id = NEW.servico_id) THEN
        RAISE EXCEPTION 'Este serviço já pertence à especialização Guindaste.';
    END IF;
    UPDATE servicos SET tipo = 'TRANSPORTE' WHERE id = NEW.servico_id;
    RETURN NEW;
END;
$$;

-- preco do item = preco_hora * tempo + acrescimo - bonus
CREATE OR REPLACE FUNCTION fn_calcular_preco() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_preco_hora numeric;
BEGIN
    SELECT preco_hora INTO v_preco_hora FROM servicos WHERE id = NEW.servico_id;
    NEW.preco := (v_preco_hora * NEW.tempo_duracao) + NEW.acrescimo - NEW.bonus;
    RETURN NEW;
END;
$$;

-- total do pedido = soma dos itens
CREATE OR REPLACE FUNCTION fn_total_pedido() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pedidos
       SET preco_total = (SELECT COALESCE(SUM(preco),0) FROM itens_pedido
                           WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id))
     WHERE codigo = COALESCE(NEW.pedido_id, OLD.pedido_id);
    RETURN NULL;
END;
$$;

-- ------------------------- TRIGGERS -------------------------

CREATE TRIGGER tg_guindaste      BEFORE INSERT ON guindastes
    FOR EACH ROW EXECUTE FUNCTION fn_guindaste();

CREATE TRIGGER tg_transporte     BEFORE INSERT ON transportes
    FOR EACH ROW EXECUTE FUNCTION fn_transporte();

CREATE TRIGGER tg_calcular_preco BEFORE INSERT OR UPDATE ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_calcular_preco();

CREATE TRIGGER tg_total_pedido   AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION fn_total_pedido();

COMMIT;