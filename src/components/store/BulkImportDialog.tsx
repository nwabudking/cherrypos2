import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInventoryItems, useAddStock, inventoryKeys } from "@/hooks/useInventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name: string;
  category: string;
  quantity: number;
  cost_per_unit?: number;
  selling_price?: number;
  valid: boolean;
  error?: string;
  itemId?: string;
}

export const BulkImportDialog = ({ open, onOpenChange }: BulkImportDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: items = [] } = useInventoryItems();
  
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  const downloadTemplate = () => {
    // Create CSV template with all categories
    const headers = ["name", "category", "quantity", "cost_per_unit", "selling_price"];
    const exampleRows = items.map(item => [
      item.name,
      item.category || "",
      "", // quantity to add
      item.cost_per_unit || "",
      (item as any).selling_price || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...exampleRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "Fill in the quantity column to import stock updates.",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Invalid file", description: "CSV must have header and data rows", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx = headers.indexOf("name");
      const categoryIdx = headers.indexOf("category");
      const quantityIdx = headers.indexOf("quantity");
      const costIdx = headers.indexOf("cost_per_unit");
      const priceIdx = headers.indexOf("selling_price");

      if (nameIdx === -1 || quantityIdx === -1) {
        toast({ title: "Invalid format", description: "CSV must have 'name' and 'quantity' columns", variant: "destructive" });
        return;
      }

      const parsed: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const name = values[nameIdx];
        const category = categoryIdx >= 0 ? values[categoryIdx] : "";
        const quantityStr = values[quantityIdx];
        const costStr = costIdx >= 0 ? values[costIdx] : "";
        const priceStr = priceIdx >= 0 ? values[priceIdx] : "";

        if (!name || !quantityStr) continue;

        const quantity = parseFloat(quantityStr);
        const cost = costStr ? parseFloat(costStr) : undefined;
        const price = priceStr ? parseFloat(priceStr) : undefined;

        // Find matching item
        const matchingItem = items.find(
          item => item.name.toLowerCase() === name.toLowerCase()
        );

        if (!matchingItem) {
          parsed.push({
            name,
            category,
            quantity,
            cost_per_unit: cost,
            selling_price: price,
            valid: false,
            error: "Item not found in inventory"
          });
        } else if (isNaN(quantity) || quantity <= 0) {
          parsed.push({
            name,
            category,
            quantity,
            cost_per_unit: cost,
            selling_price: price,
            valid: false,
            error: "Invalid quantity"
          });
        } else {
          parsed.push({
            name,
            category,
            quantity,
            cost_per_unit: cost,
            selling_price: price,
            valid: true,
            itemId: matchingItem.id
          });
        }
      }

      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = importData.filter(row => row.valid && row.itemId);
    if (validRows.length === 0) {
      toast({ title: "No valid rows", description: "Please fix errors before importing", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const row of validRows) {
        // Get current stock
        const { data: item, error: fetchError } = await supabase
          .from('inventory_items')
          .select('current_stock')
          .eq('id', row.itemId!)
          .single();

        if (fetchError) continue;

        const previousStock = item.current_stock;
        const newStock = previousStock + row.quantity;

        // Update inventory with optional price updates
        const updateData: any = { current_stock: newStock };
        if (row.cost_per_unit !== undefined) updateData.cost_per_unit = row.cost_per_unit;
        if (row.selling_price !== undefined) updateData.selling_price = row.selling_price;

        await supabase
          .from('inventory_items')
          .update(updateData)
          .eq('id', row.itemId!);

        // Create movement record
        await supabase.from('stock_movements').insert({
          inventory_item_id: row.itemId!,
          movement_type: 'in',
          quantity: row.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          notes: 'Bulk import',
          created_by: user?.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${validRows.length} stock updates.`,
      });

      setImportData([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = importData.filter(r => r.valid).length;
  const invalidCount = importData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Stock Import
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk update stock quantities and prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>

          {importData.length > 0 && (
            <>
              <div className="flex gap-4">
                <Badge className="bg-emerald-500/10 text-emerald-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} Errors
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-right">Cost</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((row, idx) => (
                      <tr key={idx} className={row.valid ? "" : "bg-destructive/5"}>
                        <td className="p-2">
                          {row.valid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="p-2">{row.name}</td>
                        <td className="p-2 text-right">{row.quantity}</td>
                        <td className="p-2 text-right">{row.cost_per_unit || "-"}</td>
                        <td className="p-2 text-right">{row.selling_price || "-"}</td>
                        <td className="p-2 text-destructive text-xs">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validCount === 0 || isImporting}
          >
            {isImporting ? "Importing..." : `Import ${validCount} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
