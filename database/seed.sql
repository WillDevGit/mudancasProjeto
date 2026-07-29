-- ============================================================
-- mudaFacil - dados de exemplo
-- Uso: psql -d mudafacil -f database/seed.sql
-- Os precos dos itens e o total dos pedidos sao calculados
-- pelas triggers do PostgreSQL (nunca informados manualmente).
-- ============================================================

BEGIN;

TRUNCATE itens_pedido, pedidos, oferecem, transportes, guindastes,
         servicos, funcionarios, telefones_cliente, clientes,
         telefones_empresa, empresas, cidades RESTART IDENTITY CASCADE;

INSERT INTO cidades (nome, estado) VALUES
  ('Curitiba','PR'),
  ('São Paulo','SP'),
  ('Florianópolis','SC'),
  ('Porto Alegre','RS'),
  ('Belo Horizonte','MG'),
  ('Rio de Janeiro','RJ');

INSERT INTO empresas (nome, endereco) VALUES
  ('Mudanças Rápidas Ltda','Av. Brasil, 1000 - Curitiba/PR'),
  ('TransCargo Mudanças','Rua das Palmeiras, 250 - São Paulo/SP'),
  ('Guincho Sul Serviços','Rod. BR-101, km 12 - Florianópolis/SC');

INSERT INTO telefones_empresa (empresa_id, telefone) VALUES
  (1,'(41) 3333-1000'),
  (1,'(41) 99999-1000'),
  (2,'(11) 4004-2000'),
  (3,'(48) 3222-3000');

INSERT INTO clientes (cpf, rg, nome, endereco, cidade_id) VALUES
  ('12345678901','8887771','Ana Souza','Rua XV de Novembro, 45',1),
  ('98765432100','7776661','Bruno Lima','Av. Paulista, 900',2),
  ('45678912300','6665551','Carla Nunes','Rua Bocaiúva, 120',3),
  ('32165498700','5554441','Diego Ramos','Av. Ipiranga, 3300',4);

INSERT INTO telefones_cliente (cliente_id, telefone) VALUES
  (1,'(41) 98888-1111'),
  (1,'(41) 3014-2222'),
  (2,'(11) 97777-2222'),
  (3,'(48) 96666-3333'),
  (4,'(51) 95555-4444');

INSERT INTO funcionarios (cpf, rg, nome, endereco, telefone, salario, tipo, empresa_id) VALUES
  ('11122233344','1112223','Carlos Mendes','Rua A, 10','(41) 96666-3333',3500.00,'MOTORISTA',1),
  ('55566677788','5556667','Diego Alves','Rua B, 20','(11) 95555-4444',4200.00,'OPERADOR',2),
  ('99988877766','9998887','Eduarda Prado','Rua C, 30','(48) 94444-5555',3900.00,'AJUDANTE',3),
  ('77788899900','7778889','Felipe Rocha','Rua D, 40','(41) 93333-6666',5100.00,'SUPERVISOR',1);

-- Servicos + especializacoes (as triggers preenchem servicos.tipo)
INSERT INTO servicos (nome, preco_hora) VALUES
  ('Transporte de móveis', 150.00),
  ('Içamento com guindaste', 400.00),
  ('Transporte de cargas pesadas', 260.00),
  ('Guindaste para obras', 520.00);

INSERT INTO transportes (servico_id, limite_carga, percentual_acrescimo) VALUES
  (1, 2000, 10),
  (3, 8000, 15);

INSERT INTO guindastes (servico_id, tamanho_base, altura, bonus) VALUES
  (2, 3.5, 18, 50),
  (4, 5.0, 30, 80);

INSERT INTO oferecem (empresa_id, servico_id) VALUES
  (1,1), (1,2), (2,1), (2,3), (3,2), (3,4);

INSERT INTO pedidos (cliente_id, empresa_id, funcionario_cpf, endereco_partida, endereco_destino,
                     cidade_partida, cidade_destino, data_solicitacao, data_resolucao, aceito) VALUES
  (1, 1, '11122233344', 'Rua XV de Novembro, 45', 'Av. Sete de Setembro, 800', 1, 1, CURRENT_DATE, NULL, TRUE),
  (2, 2, '55566677788', 'Av. Paulista, 900', 'Rua Augusta, 1500', 2, 2, CURRENT_DATE - 10, CURRENT_DATE - 3, TRUE),
  (3, 3, '99988877766', 'Rua Bocaiúva, 120', 'Av. Beira Mar, 500', 3, 3, CURRENT_DATE - 5, NULL, FALSE),
  (4, 1, '77788899900', 'Av. Ipiranga, 3300', 'Rua da Praia, 77', 4, 1, CURRENT_DATE - 2, NULL, TRUE);

-- precos e totais sao calculados pelas triggers
INSERT INTO itens_pedido (pedido_id, servico_id, tempo_duracao, acrescimo, bonus, data_fim) VALUES
  (1, 1, 4, 0,   0,  CURRENT_DATE),
  (1, 2, 2, 100, 50, CURRENT_DATE),
  (2, 1, 6, 50,  0,  CURRENT_DATE - 3),
  (3, 4, 3, 200, 80, NULL),
  (4, 3, 5, 0,   0,  NULL),
  (4, 2, 1, 0,   50, NULL);

COMMIT;