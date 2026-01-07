import { useBarContext } from "@/contexts/BarContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wine } from "lucide-react";

export function BarSelector() {
  const { activeBar, setActiveBar, bars, isLoading } = useBarContext();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wine className="h-4 w-4" />
        <span>Loading bars...</span>
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wine className="h-4 w-4" />
        <span>No bars available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Wine className="h-4 w-4 text-primary" />
      <Select
        value={activeBar?.id || ""}
        onValueChange={(value) => {
          const bar = bars.find((b) => b.id === value);
          if (bar) setActiveBar(bar);
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select bar" />
        </SelectTrigger>
        <SelectContent>
          {bars.map((bar) => (
            <SelectItem key={bar.id} value={bar.id}>
              {bar.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
