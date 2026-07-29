import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { servicosApi } from "@/lib/api";
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

export const Route = createFileRoute("/_app/servicos")({ component: ServicosPage });

type Servico = {
  id: number; nome: string | null; preco_hora: number; tipo: string | null;
  guindastes: { tamanho_base: number | null; altura: number | null; bonus: number | null } | null;
  transportes: { limite_carga: number | null; percentual_acrescimo: number | null } | null;
};
type SortKey = "nome" | "tipo" | "preco_hora";

const schema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(150),
  preco_hora: z.string().min(1, "Preço obrigatório"),
  tipo: z.enum(["GUINDASTE", "TRANSPORTE"]),
  tamanho_base: z.string().optional(),
  altura: z.string().optional(),
  bonus: z.string().optional(),
  limite_carga: z.string().optional(),
  percentual_acrescimo: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function ServicosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "nome", dir: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [deleting, setDeleting] = useState<Servico | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => servicosApi.list() as Promise<Servico[]>,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", preco_hora: "", tipo: "TRANSPORTE" },
  });
  const tipo = form.watch("tipo");

  const openNew = () => {
    setEditing(null);
    form.reset({ nome: "", preco_hora: "", tipo: "TRANSPORTE", tamanho_base: "", altura: "", bonus: "", limite_carga: "", percentual_acrescimo: "" });
    setDialogOpen(true);
  };
  const openEdit = (s: Servico) => {
    setEditing(s);
    form.reset({
      nome: s.nome ?? "", preco_hora: String(s.preco_hora),
      tipo: (s.tipo === "GUINDASTE" || s.tipo === "TRANSPORTE") ? s.tipo : "TRANSPORTE",
      tamanho_base: s.guindastes?.tamanho_base != null ? String(s.guindastes.tamanho_base) : "",
      altura: s.guindastes?.altura != null ? String(s.guindastes.altura) : "",
      bonus: s.guindastes?.bonus != null ? String(s.guindastes.bonus) : "",
      limite_carga: s.transportes?.limite_carga != null ? String(s.transportes.limite_carga) : "",
      percentual_acrescimo: s.transportes?.percentual_acrescimo != null ? String(s.transportes.percentual_acrescimo) : "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormData) => {
      // A especialização (guindaste/transporte) é aplicada pelo backend numa
      // única transação; as triggers do banco definem servicos.tipo.
      const payload = {
        nome: values.nome,
        preco_hora: Number(values.preco_hora),
        tipo: values.tipo,
        tamanho_base: values.tamanho_base ? Number(values.tamanho_base) : null,
        altura: values.altura ? Number(values.altura) : null,
        bonus: values.bonus ? Number(values.bonus) : null,
        limite_carga: values.limite_carga ? Number(values.limite_carga) : null,
        percentual_acrescimo: values.percentual_acrescimo ? Number(values.percentual_acrescimo) : null,
      };
      if (editing) {
        await servicosApi.update(editing.id, payload);
      } else {
        await servicosApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Serviço atualizado" : "Serviço criado");
      qc.invalidateQueries({ queryKey: ["servicos"] });
      qc.invalidateQueries({ queryKey: ["count", "servicos"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => servicosApi.remove(id),
    onSuccess: () => {
      toast.success("Serviço excluído");
      qc.invalidateQueries({ queryKey: ["servicos"] });
      qc.invalidateQueries({ queryKey: ["count", "servicos"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filt = q ? data.filter((s) => (s.nome ?? "").toLowerCase().includes(q) || (s.tipo ?? "").toLowerCase().includes(q)) : data;
    return sortData(filt, sort, { nome: (r) => r.nome ?? "", tipo: (r) => r.tipo ?? "", preco_hora: (r) => r.preco_hora });
  }, [data, search, sort]);

  return (
    <div>
      <PageHeader title="Serviços" search={search} onSearchChange={setSearch} onNew={openNew} newLabel="Novo serviço" />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortableHeader label="Nome" sortKey="nome" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Tipo" sortKey="tipo" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead><SortableHeader label="Preço/hora" sortKey="preco_hora" sort={sort} onSort={(k) => setSort((p) => toggleSort(p, k))} /></TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum serviço encontrado</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nome ?? "—"}</TableCell>
                <TableCell>{s.tipo ? <Badge variant={s.tipo === "GUINDASTE" ? "default" : "secondary"}>{s.tipo}</Badge> : "—"}</TableCell>
                <TableCell>{s.preco_hora.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.tipo === "GUINDASTE" && s.guindastes && <>Base: {s.guindastes.tamanho_base ?? "—"} | Altura: {s.guindastes.altura ?? "—"} | Bônus: {s.guindastes.bonus ?? "—"}</>}
                  {s.tipo === "TRANSPORTE" && s.transportes && <>Carga: {s.transportes.limite_carga ?? "—"} | Acréscimo: {s.transportes.percentual_acrescimo ?? "—"}%</>}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="preco_hora" render={({ field }) => (<FormItem><FormLabel>Preço por hora *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem><FormLabel>Tipo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="TRANSPORTE">Transporte</SelectItem>
                        <SelectItem value="GUINDASTE">Guindaste</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>

              {tipo === "GUINDASTE" && (
                <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-3">
                  <FormField control={form.control} name="tamanho_base" render={({ field }) => (<FormItem><FormLabel>Tamanho base</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="altura" render={({ field }) => (<FormItem><FormLabel>Altura</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="bonus" render={({ field }) => (<FormItem><FormLabel>Bônus</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              )}
              {tipo === "TRANSPORTE" && (
                <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
                  <FormField control={form.control} name="limite_carga" render={({ field }) => (<FormItem><FormLabel>Limite de carga</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="percentual_acrescimo" render={({ field }) => (<FormItem><FormLabel>% Acréscimo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} loading={deleteMutation.isPending} description={`Excluir o serviço "${deleting?.nome}"?`} />
    </div>
  );
}