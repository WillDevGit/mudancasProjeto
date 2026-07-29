# Roteiro do vídeo de apresentação (máx. 30 min)

Todos os integrantes devem falar. Sugestão de divisão e tempo:

| Bloco | Tempo | Conteúdo | Responsável |
| --- | --- | --- | --- |
| 1. Abertura | 2 min | Integrantes, tema do trabalho, objetivo do sistema | Integrante 1 |
| 2. Modelagem do banco | 6 min | Modelo conceitual/lógico, entidades, relacionamentos, especialização `servicos → guindastes/transportes` | Integrante 2 |
| 3. Estrutura das tabelas e restrições | 6 min | Percorrer `database/schema.sql`: tipos, PKs, FKs, `UNIQUE`, `CHECK` (`chk_salario`, `chk_preco_hora`, `chk_tempo`, `chk_datas`) | Integrante 3 |
| 4. Funções e gatilhos | 5 min | `fn_calcular_preco`, `fn_total_pedido`, `fn_guindaste`, `fn_transporte` — mostrar a execução no `psql` | Integrante 4 |
| 5. Arquitetura do programa | 4 min | React + TypeScript + Tailwind + shadcn/ui, TanStack Router/Query, validação Zod, organização de pastas | Integrante 5 |
| 6. Demonstração funcionando | 6 min | CRUD de cada tela, busca, ordenação, validação, exclusão com confirmação, pedido com itens e total automático | Todos |
| 7. Encerramento | 1 min | Dificuldades, aprendizados, como testar (referência ao `MANUAL.md`) | Integrante 1 |

**Dicas de gravação**

- Grave em 1080p com o navegador em tela cheia e zoom em 100–110%.
- Deixe o `seed.sql` carregado antes de gravar, para as telas não aparecerem vazias.
- No bloco 6, mostre um erro proposital (CPF duplicado, salário negativo) para
  evidenciar as restrições do banco e os toasts de erro.
- Mostre o `preco_total` mudando ao adicionar/remover um item do pedido — é a
  prova de que o cálculo está no banco, não no front-end.