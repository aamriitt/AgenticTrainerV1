import { Search } from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search…", className }: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2", className)}>
      <Search className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
