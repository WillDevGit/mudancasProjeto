import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (k: K) => void;
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => onSort(sortKey)}>
      {label}
      <Icon className="ml-2 h-3.5 w-3.5" />
    </Button>
  );
}

export function useSort<K extends string>(initial: SortState<K> = null) {
  return initial;
}

export function sortData<T, K extends string>(
  data: T[],
  sort: SortState<K>,
  getters: Record<K, (row: T) => string | number | null | undefined>,
): T[] {
  if (!sort) return data;
  const getter = getters[sort.key];
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...data].sort((a, b) => {
    const av = getter(a);
    const bv = getter(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv), "pt-BR") * dir;
  });
}

export function toggleSort<K extends string>(prev: SortState<K>, key: K): SortState<K> {
  if (!prev || prev.key !== key) return { key, dir: "asc" };
  if (prev.dir === "asc") return { key, dir: "desc" };
  return null;
}