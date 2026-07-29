import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2, Plus, X, Eye } from "lucide-react";
import { toast } from "sonner";

import { cidadesApi, clientesApi, empresasApi, funcionariosApi, pedidosApi, servicosApi } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SortableHeader, sortData, toggleSort, type SortState } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/pedidos")({ component: PedidosPage });

type Pedido = {
  codigo: number; cliente_id: number; empresa_id: number; funcionario_cpf: string | null;
  cidade_partida: number | null; cidade_destino: number | null;
  endereco_partida: string | null; endereco_destino: string | null;
  data_solicitacao: string | null; data_resolucao: string | null;
  aceito: boolean | null; preco_total: number | null;
  clientes: { codigo: number; nome: string } | null;
  empresas: { id: number; nome: string } | null;
  itens_pedido: { id: number; servico_id: number; tempo_duracao: number | null; acrescimo: number | null; bonus: number | null; preco: number | null; servicos: { id: number; nome: string | null } | null }[];
};
type SortKey = "codigo" | "cliente" | "empresa" | "data" | "total";

const itemSchema = z.object({
  servico_id: z.string().min(1, "Selecione um serviço"),
  tempo_duracao: z.string().min(1, "Obrigatório"),
  acrescimo: z.string().optional(),
  bonus: z.string().optional(),
});

const schema = z.object({
  cliente_id: z.string().min(1, "Cliente obrigatório"),
  empresa_id: z.string().min(1, "Empresa obrigatória"),
  funcionario_cpf: z.string().optional(),
  cidade_partida: z.string().optional(),
  cidade_destino: z.string().optional(),
  endereco_partida: z.string().optional(),
  endereco_destino: z.string().optional(),
  data_solicitacao: z.string().optional(),
  data_resolucao: z.string().optional(),
  aceito: z.boolean(),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um serviço"),
});
type FormData = z.infer<typeof schema>;

function PedidosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "codigo", dir: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState<Pedido | null>(null);
  const [viewing, setViewing] = useState<Pedido | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["pedidos"],
    queryFn: () => pedidosApi.list() as Promise<Pedido[]>,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: () => clientesApi.list(),
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: () => empresasApi.list(),
  });
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios-select"],
    queryFn: () => funcionariosApi.list(),
  });
  const { data: cidades = [] } = useQuery({
    queryKey: ["cidades-select"],
    queryFn: () => cidadesApi.list(),
  });
  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos-select"],
    queryFn: () => servicosApi.list(),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cliente_id: "", empresa_id: "", aceito: false, itens: [] },
  });
  const itens = useFieldArray({ control: form.control, name: "itens" });

  const openNew = () => {
    setEditing(null);
    form.reset({
      cliente_id: "", empresa_id: "", funcionario_cpf: undefined,
      cidade_partida: undefined, cidade_destino: undefined,
      endereco_partida: "", endereco_destino: "",
      data_solicitacao: new Date().toISOString().slice(0, 10),
      data_resolucao: "", aceito: false,
      itens: [{ servico_id: "", tempo_duracao: "", acrescimo: "0", bonus: "0" }],
    });
    setDialogOpen(true);
  };
  const openEdit = (p: Pedido) => {
    setEditing(p);
    form.reset({
      cliente_id: String(p.cliente_id), empresa_id: String(p.empresa_id),
      funcionario_cpf: p.funcionario_cpf ?? undefined,
      cidade_partida: p.cidade_partida ? String(p.cidade_partida) : undefined,
      cidade_destino: p.cidade_destino ? String(p.cidade_destino) : undefined,
      endereco_partida: p.endereco_partida ?? "", endereco_destino: p.endereco_destino ?? "",
      data_solicitacao: p.data_solicitacao ?? "", data_resolucao: p.data_resolucao ?? "",
      aceito: !!p.aceito,
      itens: p.itens_pedido.map((i) => ({
        servico_id: String(i.servico_id),
        tempo_duracao: i.tempo_duracao != null ? String(i.tempo_duracao) : "",
        acrescimo: i.acrescimo != null ? String(i.acrescimo) : "0",
        bonus: i.bonus != null ? String(i.bonus) : "0",
      })),
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        cliente_id: Number(values.cliente_id),
        empresa_id: Number(values.empresa_id),
        funcionario_cpf: values.funcionario_cpf || null,
        cidade_partida: values.cidade_partida ? Number(values.cidade_partida) : null,
        cidade_destino: values.cidade_destino ? Number(values.cidade_destino) : null,
        endereco_partida: values.endereco_partida || null,
        endereco_destino: values.endereco_destino || null,
        data_solicitacao: values.data_solicitacao || null,
        data_resolucao: values.data_resolucao || null,
        aceito: values.aceito,
      };
      // Preço dos itens e total do pedido continuam sendo calculados
      // pelas triggers do PostgreSQL.
      const itens = values.itens.map((i) => ({
        servico_id: Number(i.servico_id),
        tempo_duracao: Number(i.tempo_duracao),
        acrescimo: i.acrescimo ? Number(i.acrescimo) : 0,
        bonus: i.bonus ? Number(i.bonus) : 0,
      }));
      if (editing) {
        await pedidosApi.update(editing.codigo, { ...payload, itens });
      } else {
        await pedidosApi.create({ ...payload, itens });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Pedido atualizado" : "Pedido criado");
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["count", "pedidos"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (codigo: number) => pedidosApi.remove(codigo),
    onSuccess: () => {
      toast.success("Pedido excluído");
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["count", "pedidos"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q ? data.filter((p) =>
      String(p.codigo).includes(q) ||
      (p.clientes?.nome ?? "").toLowerCase().includes(q) ||
      (p.empresas?.nome ?? "").toLowerCase().includes(q)
    ) : data;
    return sortData(filt, sort, {
      codigo: (r) => r.codigo,
      cliente: (r) => r.clientes?.nome ?? "",
      empresa: (r) => r.empresas?.nome ?? "",
      data: (r) => r.data_solicitacao ?? "",
      total: (r) => r.preco_total ?? 0,
    });
  }, [data, search, sort]);

  const brl = (v: number | null | undefined) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  return (
    <div>
      <PageHeader title="Pedidos" search={search} onSearchChange={setSearch} onNew={openNew} newLabel="Novo pedido" />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Código" sortKey="codigo" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Cliente" sortKey="cliente" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Empresa" sortKey="empresa" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Solicitação" sortKey="data" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead>Status</TableHead>
              <TableHead><SortableHeader label="Total" sortKey="total" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.codigo}>
                <TableCell className="font-medium">#{p.codigo}</TableCell>
                <TableCell>{p.clientes?.nome ?? "—"}</TableCell>
                <TableCell>{p.empresas?.nome ?? "—"}</TableCell>
                <TableCell>{p.data_solicitacao ?? "—"}</TableCell>
                <TableCell>{p.aceito ? <Badge>Aceito</Badge> : <Badge variant="outline">Pendente</Badge>}</TableCell>
                <TableCell className="font-medium">{brl(p.preco_total)}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Editar pedido #${editing.codigo}` : "Novo pedido"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="cliente_id" render={({ field }) => (
                  <FormItem><FormLabel>Cliente *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{clientes.map((c) => <SelectItem key={c.codigo} value={String(c.codigo)}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="empresa_id" render={({ field }) => (
                  <FormItem><FormLabel>Empresa *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="funcionario_cpf" render={({ field }) => (
                <FormItem><FormLabel>Funcionário</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{funcionarios.map((f) => <SelectItem key={f.cpf} value={f.cpf}>{f.nome ?? f.cpf}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="cidade_partida" render={({ field }) => (
                  <FormItem><FormLabel>Cidade de origem</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{cidades.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}/{c.estado}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cidade_destino" render={({ field }) => (
                  <FormItem><FormLabel>Cidade de destino</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{cidades.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}/{c.estado}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endereco_partida" render={({ field }) => (<FormItem><FormLabel>Endereço origem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endereco_destino" render={({ field }) => (<FormItem><FormLabel>Endereço destino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="data_solicitacao" render={({ field }) => (<FormItem><FormLabel>Data da solicitação</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="data_resolucao" render={({ field }) => (<FormItem><FormLabel>Data de resolução</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="aceito" render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0 rounded-md border p-3">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Pedido aceito</FormLabel>
                </FormItem>
              )} />

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Itens do pedido</p>
                    <p className="text-xs text-muted-foreground">Preços calculados automaticamente pelo banco.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => itens.append({ servico_id: "", tempo_duracao: "", acrescimo: "0", bonus: "0" })}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                {form.formState.errors.itens?.message && <p className="text-xs text-destructive">{form.formState.errors.itens.message}</p>}
                {itens.fields.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-12 gap-2">
                    <FormField control={form.control} name={`itens.${i}.servico_id`} render={({ field }) => (
                      <FormItem className="col-span-12 sm:col-span-5"><FormLabel className="text-xs">Serviço *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>{servicos.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nome} ({s.tipo})</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`itens.${i}.tempo_duracao`} render={({ field }) => (<FormItem className="col-span-4 sm:col-span-2"><FormLabel className="text-xs">Duração (h) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`itens.${i}.acrescimo`} render={({ field }) => (<FormItem className="col-span-4 sm:col-span-2"><FormLabel className="text-xs">Acréscimo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`itens.${i}.bonus`} render={({ field }) => (<FormItem className="col-span-3 sm:col-span-2"><FormLabel className="text-xs">Bônus</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="col-span-1 flex items-end">
                      <Button type="button" size="icon" variant="ghost" onClick={() => itens.remove(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pedido #{viewing?.codigo}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Cliente:</span> {viewing.clientes?.nome ?? "—"}</div>
                <div><span className="text-muted-foreground">Empresa:</span> {viewing.empresas?.nome ?? "—"}</div>
                <div><span className="text-muted-foreground">Solicitação:</span> {viewing.data_solicitacao ?? "—"}</div>
                <div><span className="text-muted-foreground">Resolução:</span> {viewing.data_resolucao ?? "—"}</div>
                <div><span className="text-muted-foreground">Origem:</span> {viewing.endereco_partida ?? "—"}</div>
                <div><span className="text-muted-foreground">Destino:</span> {viewing.endereco_destino ?? "—"}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead>Duração</TableHead><TableHead>Acrésc.</TableHead><TableHead>Bônus</TableHead><TableHead className="text-right">Preço</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.itens_pedido.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.servicos?.nome ?? "—"}</TableCell>
                        <TableCell>{i.tempo_duracao}</TableCell>
                        <TableCell>{brl(i.acrescimo)}</TableCell>
                        <TableCell>{brl(i.bonus)}</TableCell>
                        <TableCell className="text-right font-medium">{brl(i.preco)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end text-base font-bold">Total: {brl(viewing.preco_total)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.codigo)} loading={deleteMutation.isPending} description={`Excluir o pedido #${deleting?.codigo}?`} />
    </div>
  );
}