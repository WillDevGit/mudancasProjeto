import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { statsApi, type StatCidade, type StatEmpresa } from "@/lib/api";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function Histograma({
  title,
  data,
  dataKey,
  xKey,
  money,
}: {
  title: string;
  data: any[];
  dataKey: string;
  xKey: string;
  money?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              fontSize={12}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v: any) => (money ? brl.format(Number(v)) : v)} />
            <Bar
              dataKey={dataKey}
              fill="currentColor"
              className="fill-primary"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Ranking({
  title,
  items,
  labelKey,
  valueKey,
  money,
}: {
  title: string;
  items: any[];
  labelKey: string;
  valueKey: string;
  money?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 text-lg font-semibold text-card-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-sm text-muted-foreground">Sem dados.</li>}
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-center justify-between border-b pb-1 text-sm last:border-0"
          >
            <span className="text-card-foreground">
              {i + 1}. {it[labelKey]}
            </span>
            <span className="font-medium">
              {money ? brl.format(Number(it[valueKey])) : it[valueKey]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dashboard() {
  const [cidades, setCidades] = useState<StatCidade[]>([]);
  const [empresas, setEmpresas] = useState<StatEmpresa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([statsApi.porCidade(), statsApi.porEmpresa()])
      .then(([c, e]) => {
        setCidades(c);
        setEmpresas(e);
      })
      .catch((err) => setErro(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top = <T,>(arr: T[], key: keyof T) =>
    [...arr].sort((a, b) => Number(b[key]) - Number(a[key])).slice(0, 5);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando relatórios...</div>;
  if (erro) return <div className="p-6 text-destructive">Erro: {erro}</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Histograma
          title="Serviços solicitados por cidade"
          data={cidades}
          xKey="cidade"
          dataKey="total_servicos"
        />
        <Histograma
          title="Pagamentos por cidade"
          data={cidades}
          xKey="cidade"
          dataKey="valor_total"
          money
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Ranking
          title="Top 5 cidades por valor investido"
          items={top(cidades, "valor_total")}
          labelKey="cidade"
          valueKey="valor_total"
          money
        />
        <Ranking
          title="Top 5 cidades por número de serviços"
          items={top(cidades, "total_servicos")}
          labelKey="cidade"
          valueKey="total_servicos"
        />
        <Ranking
          title="Top 5 empresas por número de serviços"
          items={top(empresas, "total_servicos")}
          labelKey="empresa"
          valueKey="total_servicos"
        />
        <Ranking
          title="Top 5 empresas por valores ganhos"
          items={top(empresas, "valor_ganho")}
          labelKey="empresa"
          valueKey="valor_ganho"
          money
        />
      </div>
    </div>
  );
}
