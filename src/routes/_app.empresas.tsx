import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { empresasApi } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SortableHeader, sortData, toggleSort, type SortState } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/empresas")({ component: EmpresasPage });

type Empresa = { id: number; nome: string; endereco: string; telefones_empresa: { id: number; telefone: string | null }[] };
type SortKey = "nome" | "endereco";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(150),
  endereco: z.string().trim().min(1, "Endereço obrigatório").max(200),
  telefones: z.array(z.object({ telefone: z.string().trim().min(1, "Telefone obrigatório").max(30) })),
});
type FormData = z.infer<typeof schema>;

function EmpresasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nome", dir: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [deleting, setDeleting] = useState<Empresa | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: () => empresasApi.list(),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: "", endereco: "", telefones: [] } });
  const phones = useFieldArray({ control: form.control, name: "telefones" });

  const openNew = () => { setEditing(null); form.reset({ nome: "", endereco: "", telefones: [{ telefone: "" }] }); setDialogOpen(true); };
  const openEdit = (e: Empresa) => {
    setEditing(e);
    form.reset({ nome: e.nome, endereco: e.endereco, telefones: e.telefones_empresa.map((t) => ({ telefone: t.telefone ?? "" })) });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = {
        nome: values.nome,
        endereco: values.endereco,
        telefones: values.telefones.map((t) => t.telefone),
      };
      if (editing) {
        await empresasApi.update(editing.id, payload);
      } else {
        await empresasApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Empresa atualizada" : "Empresa criada");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["count", "empresas"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => empresasApi.remove(id),
    onSuccess: () => {
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["count", "empresas"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q ? data.filter((e) => e.nome.toLowerCase().includes(q) || e.endereco.toLowerCase().includes(q)) : data;
    return sortData(filt, sort, { nome: (r) => r.nome, endereco: (r) => r.endereco });
  }, [data, search, sort]);

  return (
    <div>
      <PageHeader title="Empresas" description="Empresas parceiras" search={search} onSearchChange={setSearch} onNew={openNew} newLabel="Nova empresa" />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Nome" sortKey="nome" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Endereço" sortKey="endereco" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhuma empresa encontrada</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome}</TableCell>
                <TableCell>{e.endereco}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{e.telefones_empresa.map((t) => <Badge key={t.id} variant="secondary">{t.telefone}</Badge>)}</div></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Telefones</FormLabel>
                  <Button type="button" size="sm" variant="outline" onClick={() => phones.append({ telefone: "" })}><Plus className="h-3 w-3" /> Adicionar</Button>
                </div>
                {phones.fields.length === 0 && <p className="text-xs text-muted-foreground">Nenhum telefone adicionado.</p>}
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

      <ConfirmDelete open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} description={`Excluir a empresa "${deleting?.nome}"?`} />
    </div>
  );
}