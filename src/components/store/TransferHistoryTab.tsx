import { useInventoryTransfers } from "@/hooks/useBars";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ArrowRight, FileDown, FileSpreadsheet, Warehouse, Store } from "lucide-react";
import { exportTableToPDF, exportToExcel } from "@/lib/exportUtils";

export const TransferHistoryTab = () => {
  const { data: transfers = [], isLoading } = useInventoryTransfers();

  const handleExportPDF = () => {
    const headers = ["Date", "Item", "From", "To", "Quantity", "Status", "Notes"];
    const rows = transfers.map((t) => [
      t.created_at ? format(new Date(t.created_at), "MMM dd, yyyy HH:mm") : "-",
      t.inventory_item?.name || "Unknown",
      t.source_type === "store" ? "Store" : "Bar",
      t.destination_bar?.name || "Unknown",
      `${t.quantity} ${t.inventory_item?.unit || ""}`,
      t.status,
      t.notes || "-",
    ]);
    exportTableToPDF("Transfer History", headers, rows);
  };

  const handleExportExcel = () => {
    const data = transfers.map((t) => ({
      date: t.created_at ? format(new Date(t.created_at), "yyyy-MM-dd HH:mm") : "",
      item: t.inventory_item?.name || "Unknown",
      source: t.source_type === "store" ? "Store" : "Bar",
      destination: t.destination_bar?.name || "Unknown",
      quantity: t.quantity,
      unit: t.inventory_item?.unit || "",
      status: t.status,
      notes: t.notes || "",
    }));
    exportToExcel("transfer_history", data, [
      { key: "date", header: "Date" },
      { key: "item", header: "Item" },
      { key: "source", header: "Source" },
      { key: "destination", header: "Destination" },
      { key: "quantity", header: "Quantity" },
      { key: "unit", header: "Unit" },
      { key: "status", header: "Status" },
      { key: "notes", header: "Notes" },
    ]);
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Loading transfer history...
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <Card>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Transfer</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    {transfer.created_at &&
                      format(new Date(transfer.created_at), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transfer.inventory_item?.name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Store</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <div className="flex items-center gap-1">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{transfer.destination_bar?.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transfer.quantity} {transfer.inventory_item?.unit}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        transfer.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : transfer.status === "pending"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-destructive/10 text-destructive"
                      }
                    >
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {transfer.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transfers recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};
