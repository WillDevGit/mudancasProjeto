import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cidadesApi } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SortableHeader, sortData, toggleSort, type SortState } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/cidades")({ component: CidadesPage });

type Cidade = { id: number; nome: string; estado: string };
type SortKey = "nome" | "estado";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  estado: z.string().trim().min(2, "Estado é obrigatório").max(2, "Use a sigla com 2 letras"),
});
type FormData = z.infer<typeof schema>;

function CidadesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nome", dir: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cidade | null>(null);
  const [deleting, setDeleting] = useState<Cidade | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["cidades"],
    queryFn: () => cidadesApi.list(),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: "", estado: "" } });

  const openNew = () => {
    setEditing(null);
    form.reset({ nome: "", estado: "" });
    setDialogOpen(true);
  };
  const openEdit = (c: Cidade) => {
    setEditing(c);
    form.reset({ nome: c.nome, estado: c.estado });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      const payload = { nome: values.nome, estado: values.estado.toUpperCase() };
      if (editing) {
        await cidadesApi.update(editing.id, payload);
      } else {
        await cidadesApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cidade atualizada" : "Cidade criada");
      qc.invalidateQueries({ queryKey: ["cidades"] });
      qc.invalidateQueries({ queryKey: ["count", "cidades"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cidadesApi.remove(id),
    onSuccess: () => {
      toast.success("Cidade excluída");
      qc.invalidateQueries({ queryKey: ["cidades"] });
      qc.invalidateQueries({ queryKey: ["count", "cidades"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q
      ? data.filter((c) => c.nome.toLowerCase().includes(q) || c.estado.toLowerCase().includes(q))
      : data;
    return sortData(filt, sort, { nome: (r) => r.nome, estado: (r) => r.estado });
  }, [data, search, sort]);

  return (
    <div>
      <PageHeader
        title="Cidades"
        description="Gerencie as cidades cadastradas"
        search={search}
        onSearchChange={setSearch}
        onNew={openNew}
        newLabel="Nova cidade"
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader label="Nome" sortKey="nome" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} />
              </TableHead>
              <TableHead>
                <SortableHeader label="Estado" sortKey="estado" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} />
              </TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Nenhuma cidade encontrada</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.estado}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar cidade" : "Nova cidade"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem><FormLabel>Estado (UF) *</FormLabel><FormControl><Input maxLength={2} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        description={`Excluir a cidade "${deleting?.nome}"?`}
      />
    </div>
  );
}