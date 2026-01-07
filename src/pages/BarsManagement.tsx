import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useBars,
  useCreateBar,
  useUpdateBar,
  useDeleteBar,
  useBarInventory,
  Bar,
} from "@/hooks/useBars";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wine, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  AlertTriangle,
} from "lucide-react";

const BarsManagement = () => {
  const { role } = useAuth();
  const { toast } = useToast();

  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [isBarDialogOpen, setIsBarDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [barName, setBarName] = useState("");
  const [barDescription, setBarDescription] = useState("");
  const [viewingBarId, setViewingBarId] = useState<string | null>(null);

  const { data: bars = [], isLoading } = useBars();
  const { data: barInventory = [] } = useBarInventory(viewingBarId || "");
  const createBarMutation = useCreateBar();
  const updateBarMutation = useUpdateBar();
  const deleteBarMutation = useDeleteBar();

  const canManage = role === "super_admin" || role === "manager";

  const handleAddBar = () => {
    setSelectedBar(null);
    setBarName("");
    setBarDescription("");
    setIsBarDialogOpen(true);
  };

  const handleEditBar = (bar: Bar) => {
    setSelectedBar(bar);
    setBarName(bar.name);
    setBarDescription(bar.description || "");
    setIsBarDialogOpen(true);
  };

  const handleDeleteBar = (bar: Bar) => {
    setSelectedBar(bar);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveBar = () => {
    if (!barName.trim()) {
      toast({ title: "Bar name is required", variant: "destructive" });
      return;
    }

    if (selectedBar) {
      updateBarMutation.mutate(
        { id: selectedBar.id, data: { name: barName, description: barDescription } },
        { onSuccess: () => setIsBarDialogOpen(false) }
      );
    } else {
      createBarMutation.mutate(
        { name: barName, description: barDescription },
        { onSuccess: () => setIsBarDialogOpen(false) }
      );
    }
  };

  const handleConfirmDelete = () => {
    if (selectedBar) {
      deleteBarMutation.mutate(selectedBar.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedBar(null);
        },
      });
    }
  };

  const lowStockItems = barInventory.filter(
    (item) => item.current_stock <= item.min_stock_level
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wine className="h-6 w-6 text-primary" />
            Bars Management
          </h1>
          <p className="text-muted-foreground">
            Create and manage bar locations with separate inventories
          </p>
        </div>
        {canManage && (
          <Button onClick={handleAddBar}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bar
          </Button>
        )}
      </div>

      <Tabs defaultValue="bars" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bars">All Bars</TabsTrigger>
          {viewingBarId && <TabsTrigger value="inventory">Bar Inventory</TabsTrigger>}
        </TabsList>

        <TabsContent value="bars" className="space-y-4">
          {isLoading ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <p className="text-muted-foreground">Loading bars...</p>
              </CardContent>
            </Card>
          ) : bars.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Wine className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No bars created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first bar to start managing inventory
                </p>
                {canManage && (
                  <Button onClick={handleAddBar}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Bar
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bars.map((bar) => (
                <Card key={bar.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{bar.name}</CardTitle>
                        {bar.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {bar.description}
                          </p>
                        )}
                      </div>
                      <Badge className={bar.is_active ? "bg-emerald-500/10 text-emerald-500" : ""}>
                        {bar.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewingBarId(bar.id)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        View Inventory
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditBar(bar)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBar(bar)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {viewingBarId && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {bars.find((b) => b.id === viewingBarId)?.name} - Inventory
                  </h2>
                  {lowStockItems.length > 0 && (
                    <p className="text-sm text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {lowStockItems.length} items low on stock
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={() => setViewingBarId(null)}>
                  Back to Bars
                </Button>
              </div>

              <Card>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Min Level</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {barInventory.map((item) => {
                        const isLowStock = item.current_stock <= item.min_stock_level;
                        const isOutOfStock = item.current_stock <= 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.inventory_item?.name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.inventory_item?.category || "Uncategorized"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.current_stock} {item.inventory_item?.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.min_stock_level} {item.inventory_item?.unit}
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
                      {barInventory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No inventory in this bar. Transfer stock from the Store.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Bar Dialog */}
      <Dialog open={isBarDialogOpen} onOpenChange={setIsBarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBar ? "Edit Bar" : "Create New Bar"}</DialogTitle>
            <DialogDescription>
              {selectedBar
                ? "Update the bar details below."
                : "Add a new bar location with its own inventory."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bar Name *</Label>
              <Input
                placeholder="e.g., Main Bar, Rooftop Bar"
                value={barName}
                onChange={(e) => setBarName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this bar location"
                value={barDescription}
                onChange={(e) => setBarDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBarDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBar}
              disabled={createBarMutation.isPending || updateBarMutation.isPending}
            >
              {createBarMutation.isPending || updateBarMutation.isPending
                ? "Saving..."
                : selectedBar
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBar?.name}"? This will also
              remove all inventory records for this bar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBarMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BarsManagement;
