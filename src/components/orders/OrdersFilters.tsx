import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface OrdersFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  orderTypeFilter: string;
  setOrderTypeFilter: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  dateFilter: Date | undefined;
  setDateFilter: (value: Date | undefined) => void;
}

export const OrdersFilters = ({
  statusFilter,
  setStatusFilter,
  orderTypeFilter,
  setOrderTypeFilter,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
}: OrdersFiltersProps) => {
  const clearFilters = () => {
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSearchQuery("");
    setDateFilter(undefined);
  };

  const hasActiveFilters = 
    statusFilter !== "all" || 
    orderTypeFilter !== "all" || 
    searchQuery !== "" || 
    dateFilter !== undefined;

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background"
        />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="preparing">Preparing</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
        <SelectTrigger className="w-[150px] bg-background">
          <SelectValue placeholder="Order Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="dine_in">Dine In</SelectItem>
          <SelectItem value="takeaway">Takeaway</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
          <SelectItem value="bar_only">Bar Only</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[180px] justify-start text-left font-normal bg-background",
              !dateFilter && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFilter}
            onSelect={setDateFilter}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
