import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBars } from "@/hooks/useBars";
import { ChefHat, Clock, CheckCircle2, RefreshCw, Flame, Store, Volume2, VolumeX, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const orderTypeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
  bar_only: "Bar Only",
};

// Base64 encoded notification sound
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8EF3GVyvPr2JdhSjxAaYy9s6VhVkdXj8bg2L9tdEQ5RWV+rsvW24NnRDc/XXqivcfWm3JdSUM9RVWBqMbf2ZVnTEE9RVt+rcnf25RoTEE9RVuAs8rg25NoTEI9Rlt+rcnf25NoTEI9RVt+rcnf25NoTEI9RVt/rcnf25NoTEI9RVt/rcnf25NoTEE9RVt/rcnf';

const Kitchen = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "preparing" | "all">("pending");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const previousOrderCountRef = useRef<number>(0);

  const { data: bars = [] } = useBars();

  // Fetch kitchen orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders", filter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .neq('order_type', 'bar_only')
        .order('created_at', { ascending: true });
      
      if (filter !== "all") {
        query = query.eq('status', filter);
      } else {
        query = query.in('status', ['pending', 'preparing']);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 3000, // Refresh every 3 seconds for faster updates
  });

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as any;
          // Only notify for non-bar-only orders
          if (newOrder.order_type !== 'bar_only') {
            setNewOrderAlert(true);
            if (soundEnabled) {
              playNotificationSound();
            }
            toast({
              title: "🔔 New Order!",
              description: `Order ${newOrder.order_number} received`,
              duration: 5000,
            });
            queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
            setTimeout(() => setNewOrderAlert(false), 3000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, queryClient, toast]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND);
      audio.volume = 0.8;
      audio.play().catch(() => {
        console.log("Audio playback blocked");
      });
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ 
        title: "Order Updated",
        description: `Order ${data.order_number} is now ${data.status}` 
      });
      
      // Play sound for ready orders
      if (soundEnabled && data.status === 'ready') {
        playNotificationSound();
      }
    },
    onError: () => {
      toast({ title: "Failed to update order", variant: "destructive" });
    },
  });

  const getBarName = (barId: string | null) => {
    if (!barId) return null;
    const bar = bars.find(b => b.id === barId);
    return bar?.name;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "preparing":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "ready":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getOrderUrgency = (createdAt: string) => {
    const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
    if (minutes > 20) return "urgent";
    if (minutes > 10) return "warning";
    return "normal";
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "preparing";
      case "preparing":
        return "ready";
      default:
        return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case "pending":
        return "Start Cooking";
      case "preparing":
        return "Mark Ready";
      default:
        return null;
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const urgentCount = orders.filter((o) => getOrderUrgency(o.created_at!) === "urgent").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`relative ${newOrderAlert ? 'animate-bounce' : ''}`}>
            <ChefHat className="h-6 w-6 text-primary" />
            {newOrderAlert && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kitchen Display</h1>
            <p className="text-muted-foreground">Manage food orders in real-time</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-1"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 opacity-50" />
            )}
            Sound {soundEnabled ? "On" : "Off"}
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
            className="relative"
          >
            Pending
            {pendingCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-amber-500">{pendingCount}</Badge>
            )}
          </Button>
          <Button
            variant={filter === "preparing" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("preparing")}
            className="relative"
          >
            Preparing
            {preparingCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 justify-center bg-blue-500">{preparingCount}</Badge>
            )}
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Active
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`bg-amber-500/10 border-amber-500/20 ${newOrderAlert ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className={`h-4 w-4 text-amber-500 ${newOrderAlert ? 'animate-bounce' : ''}`} />
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{preparingCount}</div>
            <p className="text-sm text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-500">
              {orders.filter((o) => o.status === "ready").length}
            </div>
            <p className="text-sm text-muted-foreground">Ready</p>
          </CardContent>
        </Card>
        <Card className={`${urgentCount > 0 ? "bg-red-500/10 border-red-500/20 animate-pulse" : "bg-red-500/10 border-red-500/20"}`}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{urgentCount}</div>
            <p className="text-sm text-muted-foreground">Urgent (&gt;20min)</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No food orders</h3>
            <p className="text-muted-foreground">New food orders will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const urgency = getOrderUrgency(order.created_at!);
            const barName = getBarName(order.bar_id);
            return (
              <Card
                key={order.id}
                className={`flex flex-col ${
                  urgency === "urgent"
                    ? "border-red-500 ring-2 ring-red-500/20 animate-pulse"
                    : urgency === "warning"
                    ? "border-amber-500"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {order.order_number}
                        {urgency === "urgent" && (
                          <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.created_at!), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {orderTypeLabels[order.order_type] || order.order_type}
                    </Badge>
                    {order.table_number && (
                      <Badge variant="secondary" className="text-xs">
                        Table {order.table_number}
                      </Badge>
                    )}
                    {barName && (
                      <Badge variant="outline" className="text-xs bg-primary/5">
                        <Store className="h-3 w-3 mr-1" />
                        {barName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 max-h-48">
                  <CardContent className="pt-0 space-y-2">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded bg-muted/50"
                      >
                        <span className="font-bold text-primary min-w-[24px]">
                          {item.quantity}x
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item_name}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </ScrollArea>

                {getNextStatus(order.status) && (
                  <div className="p-4 pt-0 mt-auto">
                    <Button
                      className="w-full"
                      variant={urgency === "urgent" ? "destructive" : "default"}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: getNextStatus(order.status)!,
                        })
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {getNextStatusLabel(order.status)}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kitchen;