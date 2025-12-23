import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OrdersHeader } from "@/components/orders/OrdersHeader";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import type { Tables } from "@/integrations/supabase/types";

export type OrderWithItems = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
  payments: Tables<"payments">[];
};

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

const Orders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", statusFilter, orderTypeFilter, searchQuery, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          payments (*)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (orderTypeFilter !== "all") {
        query = query.eq("order_type", orderTypeFilter);
      }

      if (searchQuery) {
        query = query.ilike("order_number", `%${searchQuery}%`);
      }

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OrderWithItems[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrder(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const activeOrders = orders.filter(o => 
    ["pending", "preparing", "ready"].includes(o.status)
  );
  
  const completedOrders = orders.filter(o => 
    ["completed", "cancelled"].includes(o.status)
  );

  return (
    <div className="space-y-6">
      <OrdersHeader 
        activeCount={activeOrders.length}
        completedCount={completedOrders.length}
      />

      <OrdersFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        orderTypeFilter={orderTypeFilter}
        setOrderTypeFilter={setOrderTypeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      <OrdersTable
        orders={orders}
        isLoading={isLoading}
        onViewOrder={setSelectedOrder}
        onUpdateStatus={(orderId, status) => 
          updateStatusMutation.mutate({ orderId, status })
        }
      />

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdateStatus={(status) => 
          selectedOrder && updateStatusMutation.mutate({ 
            orderId: selectedOrder.id, 
            status 
          })
        }
        isUpdating={updateStatusMutation.isPending}
      />
    </div>
  );
};

export default Orders;
