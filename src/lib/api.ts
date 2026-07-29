// Camada única de comunicação com a API REST (Express + PostgreSQL).
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${BASE_URL}. O backend está rodando?`);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(body?.error ?? `Erro ${res.status} ao chamar ${path}`);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};

/* ----------------------------- Tipos ----------------------------- */

export type Cidade = { id: number; nome: string; estado: string };

export type TelefoneRow = { id: number; telefone: string | null };

export type Empresa = {
  id: number;
  nome: string;
  endereco: string;
  telefones_empresa: TelefoneRow[];
};

export type Cliente = {
  codigo: number;
  cpf: string;
  nome: string;
  rg: string | null;
  endereco: string | null;
  cidade_id: number | null;
  cidades: Cidade | null;
  telefones_cliente: TelefoneRow[];
};

export type Funcionario = {
  cpf: string;
  nome: string | null;
  rg: string | null;
  endereco: string | null;
  telefone: string | null;
  salario: number | null;
  tipo: string | null;
  empresa_id: number | null;
  empresas: { id: number; nome: string } | null;
};

export type Servico = {
  id: number;
  nome: string | null;
  preco_hora: number;
  tipo: string | null;
  guindastes: { tamanho_base: number | null; altura: number | null; bonus: number | null } | null;
  transportes: { limite_carga: number | null; percentual_acrescimo: number | null } | null;
};

export type ItemPedido = {
  id: number;
  servico_id: number;
  tempo_duracao: number | null;
  acrescimo: number | null;
  bonus: number | null;
  preco: number | null;
  data_fim: string | null;
  servicos: { id: number; nome: string | null } | null;
};

export type Pedido = {
  codigo: number;
  cliente_id: number;
  empresa_id: number;
  funcionario_cpf: string | null;
  cidade_partida: number | null;
  cidade_destino: number | null;
  endereco_partida: string | null;
  endereco_destino: string | null;
  data_solicitacao: string | null;
  data_resolucao: string | null;
  aceito: boolean | null;
  preco_total: number | null;
  clientes: { codigo: number; nome: string } | null;
  empresas: { id: number; nome: string } | null;
  itens_pedido: ItemPedido[];
};

export type Counts = {
  empresas: number;
  clientes: number;
  cidades: number;
  funcionarios: number;
  servicos: number;
  pedidos: number;
};

/* --------------------------- Endpoints --------------------------- */

export const cidadesApi = {
  list: () => api.get<Cidade[]>("/cidades"),
  create: (body: { nome: string; estado: string }) => api.post<Cidade>("/cidades", body),
  update: (id: number, body: { nome: string; estado: string }) => api.put<Cidade>(`/cidades/${id}`, body),
  remove: (id: number) => api.del(`/cidades/${id}`),
};

export const empresasApi = {
  list: () => api.get<Empresa[]>("/empresas"),
  create: (body: { nome: string; endereco: string; telefones: string[] }) =>
    api.post<Empresa>("/empresas", body),
  update: (id: number, body: { nome: string; endereco: string; telefones: string[] }) =>
    api.put<Empresa>(`/empresas/${id}`, body),
  remove: (id: number) => api.del(`/empresas/${id}`),
};

export type ClientePayload = {
  cpf: string;
  nome: string;
  rg: string | null;
  endereco: string | null;
  cidade_id: number | null;
  telefones: string[];
};

export const clientesApi = {
  list: () => api.get<Cliente[]>("/clientes"),
  create: (body: ClientePayload) => api.post<Cliente>("/clientes", body),
  update: (codigo: number, body: ClientePayload) => api.put<Cliente>(`/clientes/${codigo}`, body),
  remove: (codigo: number) => api.del(`/clientes/${codigo}`),
};

export type FuncionarioPayload = {
  cpf: string;
  nome: string | null;
  rg: string | null;
  endereco: string | null;
  telefone: string | null;
  salario: number | null;
  tipo: string | null;
  empresa_id: number | null;
};

export const funcionariosApi = {
  list: () => api.get<Funcionario[]>("/funcionarios"),
  create: (body: FuncionarioPayload) => api.post<Funcionario>("/funcionarios", body),
  update: (cpf: string, body: FuncionarioPayload) => api.put<Funcionario>(`/funcionarios/${cpf}`, body),
  remove: (cpf: string) => api.del(`/funcionarios/${cpf}`),
};

export type ServicoPayload = {
  nome: string;
  preco_hora: number;
  tipo: "GUINDASTE" | "TRANSPORTE";
  tamanho_base?: number | null;
  altura?: number | null;
  bonus?: number | null;
  limite_carga?: number | null;
  percentual_acrescimo?: number | null;
};

export const servicosApi = {
  list: () => api.get<Servico[]>("/servicos"),
  create: (body: ServicoPayload) => api.post<Servico>("/servicos", body),
  update: (id: number, body: ServicoPayload) => api.put<Servico>(`/servicos/${id}`, body),
  remove: (id: number) => api.del(`/servicos/${id}`),
};

export type PedidoPayload = {
  cliente_id: number;
  empresa_id: number;
  funcionario_cpf: string | null;
  cidade_partida: number | null;
  cidade_destino: number | null;
  endereco_partida: string | null;
  endereco_destino: string | null;
  data_solicitacao: string | null;
  data_resolucao: string | null;
  aceito: boolean;
  itens: { servico_id: number; tempo_duracao: number; acrescimo: number; bonus: number }[];
};

export const pedidosApi = {
  list: () => api.get<Pedido[]>("/pedidos"),
  create: (body: PedidoPayload) => api.post<Pedido>("/pedidos", body),
  update: (codigo: number, body: PedidoPayload) => api.put<Pedido>(`/pedidos/${codigo}`, body),
  remove: (codigo: number) => api.del(`/pedidos/${codigo}`),
};

export const statsApi = {
  counts: () => api.get<Counts>("/stats/counts"),
};