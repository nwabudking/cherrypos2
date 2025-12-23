import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, MoreHorizontal, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { OrderWithItems, OrderStatus } from "@/pages/Orders";

interface OrdersTableProps {
  orders: OrderWithItems[];
  isLoading: boolean;
  onViewOrder: (order: OrderWithItems) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  preparing: { label: "Preparing", variant: "default" },
  ready: { label: "Ready", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const orderTypeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
  bar_only: "Bar Only",
};

export const OrdersTable = ({
  orders,
  isLoading,
  onViewOrder,
  onUpdateStatus,
}: OrdersTableProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No orders found</p>
      </Card>
    );
  }

  const getNextStatus = (currentStatus: string): OrderStatus | null => {
    const flow: Record<string, OrderStatus> = {
      pending: "preparing",
      preparing: "ready",
      ready: "completed",
    };
    return flow[currentStatus] || null;
  };

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Order #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Table</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const nextStatus = getNextStatus(order.status);
            
            return (
              <TableRow 
                key={order.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewOrder(order)}
              >
                <TableCell className="font-medium">{order.order_number}</TableCell>
                <TableCell>{orderTypeLabels[order.order_type] || order.order_type}</TableCell>
                <TableCell>{order.table_number || "-"}</TableCell>
                <TableCell>{order.order_items?.length || 0} items</TableCell>
                <TableCell className="font-medium">
                  ₦{order.total_amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(order.created_at!), "HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {nextStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateStatus(order.id, nextStatus)}
                      >
                        <ChevronRight className="h-4 w-4 mr-1" />
                        {statusConfig[nextStatus].label}
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewOrder(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {order.status !== "cancelled" && order.status !== "completed" && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => onUpdateStatus(order.id, "cancelled")}
                          >
                            Cancel Order
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};
