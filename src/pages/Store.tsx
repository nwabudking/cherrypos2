import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInventoryItems,
  useLowStockItems,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useAddStock,
  useRemoveStock,
  useAdjustStock,
} from "@/hooks/useInventory";
import { useBars, useTransferToBar, useInventoryTransfers } from "@/hooks/useBars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  ArrowRightLeft, 
  AlertTriangle, 
  Plus, 
  Search, 
  Send,
  History,
  Warehouse,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Store = () => {
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedBarId, setSelectedBarId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const { data: items = [], isLoading } = useInventoryItems();
  const { data: bars = [] } = useBars();
  const { data: transfers = [] } = useInventoryTransfers();
  const transferMutation = useTransferToBar();

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const lowStockItems = items.filter((i) => i.current_stock <= i.min_stock_level);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesLowStock = !showLowStock || item.current_stock <= item.min_stock_level;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const canManage = role === "super_admin" || role === "manager" || role === "inventory_officer";
  const canTransfer = role === "super_admin" || role === "manager";

  const handleTransferClick = (item: any) => {
    setSelectedItem(item);
    setSelectedBarId("");
    setTransferQuantity("");
    setTransferNotes("");
    setTransferDialogOpen(true);
  };

  const handleTransfer = () => {
    if (!selectedItem || !selectedBarId || !transferQuantity) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const qty = parseFloat(transferQuantity);
    if (qty <= 0 || qty > selectedItem.current_stock) {
      toast({ 
        title: "Invalid quantity", 
        description: `Available: ${selectedItem.current_stock} ${selectedItem.unit}`,
        variant: "destructive" 
      });
      return;
    }

    transferMutation.mutate(
      {
        barId: selectedBarId,
        inventoryItemId: selectedItem.id,
        quantity: qty,
        notes: transferNotes || undefined,
      },
      {
        onSuccess: () => {
          setTransferDialogOpen(false);
          setSelectedItem(null);
        },
      }
    );
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            Store Inventory
          </h1>
          <p className="text-muted-foreground">
            Central inventory management - Transfer stock to bars
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockItems.length > 0 ? "border-amber-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? "bg-amber-500/10" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${lowStockItems.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bars.length}</p>
                <p className="text-sm text-muted-foreground">Active Bars</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <History className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{transfers.length}</p>
                <p className="text-sm text-muted-foreground">Transfers Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Store Inventory</TabsTrigger>
          <TabsTrigger value="transfers">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Low Stock Only
            </Button>
          </div>

          {/* Inventory Table */}
          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    {canTransfer && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isLowStock = item.current_stock <= item.min_stock_level;
                    const isOutOfStock = item.current_stock <= 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category || "Uncategorized"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.current_stock} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.min_stock_level} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.cost_per_unit)}
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
                        {canTransfer && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleTransferClick(item)}
                              disabled={item.current_stock <= 0}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Transfer
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transfers</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        {transfer.created_at && formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transfer.inventory_item?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transfer.destination_bar?.name || "Unknown Bar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {transfer.quantity} {transfer.inventory_item?.unit}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transfer.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          {transfer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transfers yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Bar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedItem.current_stock} {selectedItem.unit}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Destination Bar *</Label>
              <Select value={selectedBarId} onValueChange={setSelectedBarId}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                placeholder={`Max: ${selectedItem?.current_stock || 0}`}
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                min={0}
                max={selectedItem?.current_stock || 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add notes about this transfer..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Store;
