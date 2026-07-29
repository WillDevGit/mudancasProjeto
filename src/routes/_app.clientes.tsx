import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { cidadesApi, clientesApi } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SortableHeader, sortData, toggleSort, type SortState } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/clientes")({ component: ClientesPage });

type Cliente = {
  codigo: number; cpf: string; nome: string; rg: string | null; endereco: string | null; cidade_id: number | null;
  cidades: { id: number; nome: string; estado: string } | null;
  telefones_cliente: { id: number; telefone: string | null }[];
};
type SortKey = "nome" | "cpf" | "cidade";

const schema = z.object({
  cpf: z.string().trim().min(1, "CPF obrigatório").max(20),
  nome: z.string().trim().min(1, "Nome obrigatório").max(150),
  rg: z.string().trim().max(20).optional(),
  endereco: z.string().trim().max(200).optional(),
  cidade_id: z.string().optional(),
  telefones: z.array(z.object({ telefone: z.string().trim().min(1, "Telefone obrigatório").max(30) })),
});
type FormData = z.infer<typeof schema>;

function ClientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nome", dir: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState<Cliente | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => clientesApi.list() as Promise<Cliente[]>,
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ["cidades"],
    queryFn: () => cidadesApi.list(),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { cpf: "", nome: "", rg: "", endereco: "", cidade_id: undefined, telefones: [] } });
  const phones = useFieldArray({ control: form.control, name: "telefones" });

  const openNew = () => {
    setEditing(null);
    form.reset({ cpf: "", nome: "", rg: "", endereco: "", cidade_id: undefined, telefones: [{ telefone: "" }] });
    setDialogOpen(true);
  };
  const openEdit = (c: Cliente) => {
    setEditing(c);
    form.reset({
      cpf: c.cpf, nome: c.nome, rg: c.rg ?? "", endereco: c.endereco ?? "",
      cidade_id: c.cidade_id ? String(c.cidade_id) : undefined,
      telefones: c.telefones_cliente.map((t) => ({ telefone: t.telefone ?? "" })),
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        cpf: values.cpf, nome: values.nome,
        rg: values.rg || null, endereco: values.endereco || null,
        cidade_id: values.cidade_id ? Number(values.cidade_id) : null,
        telefones: values.telefones.map((t) => t.telefone),
      };
      if (editing) {
        await clientesApi.update(editing.codigo, payload);
      } else {
        await clientesApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["count", "clientes"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (codigo: number) => clientesApi.remove(codigo),
    onSuccess: () => {
      toast.success("Cliente excluído");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["count", "clientes"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q ? data.filter((c) => c.nome.toLowerCase().includes(q) || c.cpf.toLowerCase().includes(q) || (c.cidades?.nome.toLowerCase().includes(q) ?? false)) : data;
    return sortData(filt, sort, { nome: (r) => r.nome, cpf: (r) => r.cpf, cidade: (r) => r.cidades?.nome ?? "" });
  }, [data, search, sort]);

  return (
    <div>
      <PageHeader title="Clientes" search={search} onSearchChange={setSearch} onNew={openNew} newLabel="Novo cliente" />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Nome" sortKey="nome" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="CPF" sortKey="cpf" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Cidade" sortKey="cidade" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.codigo}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.cpf}</TableCell>
                <TableCell>{c.cidades ? `${c.cidades.nome}/${c.cidades.estado}` : "—"}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{c.telefones_cliente.filter((t) => t.telefone).map((t) => <Badge key={t.id} variant="secondary">{t.telefone}</Badge>)}</div></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="cpf" render={({ field }) => (<FormItem><FormLabel>CPF *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="rg" render={({ field }) => (<FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="cidade_id" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{cidades.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}/{c.estado}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Telefones</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => phones.append({ telefone: "" })}><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                {phones.fields.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <FormField control={form.control} name={`telefones.${i}.telefone`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => phones.remove(i)}><X className="h-4 w-4" /></Button>
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

      <ConfirmDelete open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.codigo)} loading={deleteMutation.isPending} description={`Excluir o cliente "${deleting?.nome}"?`} />
    </div>
  );
}