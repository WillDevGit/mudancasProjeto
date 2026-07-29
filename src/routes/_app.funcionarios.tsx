import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { empresasApi, funcionariosApi } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SortableHeader, sortData, toggleSort, type SortState } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/funcionarios")({ component: FuncionariosPage });

type Funcionario = {
  cpf: string; nome: string | null; rg: string | null; endereco: string | null;
  telefone: string | null; salario: number | null; tipo: string | null; empresa_id: number | null;
  empresas: { id: number; nome: string } | null;
};
type SortKey = "nome" | "cpf" | "tipo" | "salario" | "empresa";

const schema = z.object({
  cpf: z.string().trim().min(1, "CPF obrigatório").max(20),
  nome: z.string().trim().min(1, "Nome obrigatório").max(150),
  rg: z.string().trim().max(20).optional(),
  endereco: z.string().trim().max(200).optional(),
  telefone: z.string().trim().max(30).optional(),
  salario: z.string().optional(),
  tipo: z.string().trim().max(50).optional(),
  empresa_id: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function FuncionariosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nome", dir: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Funcionario | null>(null);
  const [deleting, setDeleting] = useState<Funcionario | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: () => funcionariosApi.list() as Promise<Funcionario[]>,
  });
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-select"],
    queryFn: () => empresasApi.list(),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { cpf: "", nome: "", rg: "", endereco: "", telefone: "", salario: "", tipo: "", empresa_id: undefined } });

  const openNew = () => {
    setEditing(null);
    form.reset({ cpf: "", nome: "", rg: "", endereco: "", telefone: "", salario: "", tipo: "", empresa_id: undefined });
    setDialogOpen(true);
  };
  const openEdit = (f: Funcionario) => {
    setEditing(f);
    form.reset({
      cpf: f.cpf, nome: f.nome ?? "", rg: f.rg ?? "", endereco: f.endereco ?? "",
      telefone: f.telefone ?? "", salario: f.salario != null ? String(f.salario) : "",
      tipo: f.tipo ?? "", empresa_id: f.empresa_id ? String(f.empresa_id) : undefined,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        cpf: values.cpf, nome: values.nome,
        rg: values.rg || null, endereco: values.endereco || null,
        telefone: values.telefone || null,
        salario: values.salario ? Number(values.salario) : null,
        tipo: values.tipo || null,
        empresa_id: values.empresa_id ? Number(values.empresa_id) : null,
      };
      if (editing) {
        await funcionariosApi.update(editing.cpf, payload);
      } else {
        await funcionariosApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Funcionário atualizado" : "Funcionário criado");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      qc.invalidateQueries({ queryKey: ["count", "funcionarios"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (cpf: string) => funcionariosApi.remove(cpf),
    onSuccess: () => {
      toast.success("Funcionário excluído");
      qc.invalidateQueries({ queryKey: ["funcionarios"] });
      qc.invalidateQueries({ queryKey: ["count", "funcionarios"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q ? data.filter((f) => (f.nome ?? "").toLowerCase().includes(q) || f.cpf.toLowerCase().includes(q) || (f.tipo ?? "").toLowerCase().includes(q)) : data;
    return sortData(filt, sort, {
      nome: (r) => r.nome ?? "", cpf: (r) => r.cpf,
      tipo: (r) => r.tipo ?? "", salario: (r) => r.salario ?? 0,
      empresa: (r) => r.empresas?.nome ?? "",
    });
  }, [data, search, sort]);

  return (
    <div>
      <PageHeader title="Funcionários" search={search} onSearchChange={setSearch} onNew={openNew} newLabel="Novo funcionário" />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Nome" sortKey="nome" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="CPF" sortKey="cpf" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Tipo" sortKey="tipo" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Salário" sortKey="salario" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Empresa" sortKey="empresa" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum funcionário encontrado</TableCell></TableRow>
            ) : filtered.map((f) => (
              <TableRow key={f.cpf}>
                <TableCell className="font-medium">{f.nome ?? "—"}</TableCell>
                <TableCell>{f.cpf}</TableCell>
                <TableCell>{f.tipo ?? "—"}</TableCell>
                <TableCell>{f.salario != null ? f.salario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                <TableCell>{f.empresas?.nome ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="cpf" render={({ field }) => (<FormItem><FormLabel>CPF *</FormLabel><FormControl><Input {...field} disabled={!!editing} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="rg" render={({ field }) => (<FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="salario" render={({ field }) => (<FormItem><FormLabel>Salário</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="tipo" render={({ field }) => (<FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ex: Motorista" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="empresa_id" render={({ field }) => (
                  <FormItem><FormLabel>Empresa</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.cpf)} loading={deleteMutation.isPending} description={`Excluir o funcionário "${deleting?.nome ?? deleting?.cpf}"?`} />
    </div>
  );
}