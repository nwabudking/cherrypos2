import { useState } from "react";
import { useBars, useBarInventory } from "@/hooks/useBars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Package, Store } from "lucide-react";

export const BarInventoryLevelsTab = () => {
  const { data: bars = [] } = useBars();
  const [selectedBarId, setSelectedBarId] = useState<string>("");

  const { data: inventory = [], isLoading } = useBarInventory(selectedBarId);

  const activeBars = bars.filter(bar => bar.is_active);
  const lowStockCount = inventory.filter(
    item => item.current_stock <= item.min_stock_level
  ).length;
  const outOfStockCount = inventory.filter(item => item.current_stock <= 0).length;

  return (
    <div className="space-y-4">
      {/* Bar Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedBarId} onValueChange={setSelectedBarId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a bar to view inventory" />
          </SelectTrigger>
          <SelectContent>
            {activeBars.map((bar) => (
              <SelectItem key={bar.id} value={bar.id}>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  {bar.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedBarId ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a bar to view its inventory levels</p>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{inventory.length}</p>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={lowStockCount > 0 ? "border-amber-500" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${lowStockCount > 0 ? "bg-amber-500/10" : "bg-muted"}`}>
                    <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{lowStockCount}</p>
                    <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={outOfStockCount > 0 ? "border-destructive" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${outOfStockCount > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                    <Package className={`h-5 w-5 ${outOfStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{outOfStockCount}</p>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Table */}
          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const isLowStock = item.current_stock <= item.min_stock_level;
                    const isOutOfStock = item.current_stock <= 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.inventory_item?.name || "Unknown Item"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.current_stock} {item.inventory_item?.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.min_stock_level}
                        </TableCell>
                        <TableCell>
                          {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {inventory.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No inventory items in this bar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
};
