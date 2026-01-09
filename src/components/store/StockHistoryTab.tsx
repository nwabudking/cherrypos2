import { useStockMovements } from "@/hooks/useInventory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";

export const StockHistoryTab = () => {
  const { data: movements = [], isLoading } = useStockMovements();

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowUpCircle className="h-4 w-4 text-emerald-500" />;
      case "out":
        return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "in":
        return <Badge className="bg-emerald-500/10 text-emerald-500">Stock In</Badge>;
      case "out":
        return <Badge className="bg-destructive/10 text-destructive">Stock Out</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-500">Adjustment</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Loading stock history...
      </Card>
    );
  }

  return (
    <Card>
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Previous</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">New Stock</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>
                  {movement.created_at && format(new Date(movement.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">
                  {(movement as any).inventory_items?.name || "Unknown"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getMovementIcon(movement.movement_type)}
                    {getMovementBadge(movement.movement_type)}
                  </div>
                </TableCell>
                <TableCell className="text-right">{movement.previous_stock}</TableCell>
                <TableCell className="text-right font-medium">
                  {movement.movement_type === "in" ? "+" : movement.movement_type === "out" ? "-" : ""}
                  {movement.quantity}
                </TableCell>
                <TableCell className="text-right">{movement.new_stock}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {movement.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No stock movements recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
};
