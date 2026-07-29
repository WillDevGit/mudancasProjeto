import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, MapPin, UserCog, Wrench, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statsApi, type Counts } from "@/lib/api";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function useCounts() {
  return useQuery({ queryKey: ["count"], queryFn: () => statsApi.counts() });
}

function StatCard({ title, value, icon: Icon, loading }: { title: string; value: number | undefined; icon: React.ElementType; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? "—" : value}</div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useCounts();
  const counts: Counts | undefined = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema (placeholder)</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Empresas" value={counts?.empresas} loading={isLoading} icon={Building2} />
        <StatCard title="Clientes" value={counts?.clientes} loading={isLoading} icon={Users} />
        <StatCard title="Cidades" value={counts?.cidades} loading={isLoading} icon={MapPin} />
        <StatCard title="Funcionários" value={counts?.funcionarios} loading={isLoading} icon={UserCog} />
        <StatCard title="Serviços" value={counts?.servicos} loading={isLoading} icon={Wrench} />
        <StatCard title="Pedidos" value={counts?.pedidos} loading={isLoading} icon={ClipboardList} />
      </div>
    </div>
  );
}