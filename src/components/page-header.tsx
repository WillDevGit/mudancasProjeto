import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PageHeader({
  title,
  description,
  search,
  onSearchChange,
  onNew,
  newLabel = "Novo",
  searchPlaceholder = "Pesquisar...",
}: {
  title: string;
  description?: string;
  search: string;
  onSearchChange: (v: string) => void;
  onNew: () => void;
  newLabel?: string;
  searchPlaceholder?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" />
          {newLabel}
        </Button>
      </div>
    </div>
  );
}