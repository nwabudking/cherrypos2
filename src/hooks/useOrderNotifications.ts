import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseOrderNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  filterType?: "kitchen" | "bar" | "all";
}

// Base64 encoded notification sound
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8EF3GVyvPr2JdhSjxAaYy9s6VhVkdXj8bg2L9tdEQ5RWV+rsvW24NnRDc/XXqivcfWm3JdSUM9RVWBqMbf2ZVnTEE9RVt+rcnf25RoTEE9RVuAs8rg25NoTEI9Rlt+rcnf25NoTEI9RVt+rcnf25NoTEI9RVt/rcnf25NoTEI9RVt/rcnf25NoTEE9RVt/rcnf';

// Longer notification sound for urgent orders
const URGENT_NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YTtvAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8EF3GVyvPr2JdhSjxAaYy9s6VhVkdXj8bg2L9tdEQ5RWV+rsvW24NnRDc/XXqivcfWm3JdSUM9RVWBqMbf2ZVnTEE9RVt+rcnf25RoTEE9RVuAs8rg25NoTEI9Rlt+rcnf25NoTEI9RVt+rcnf25NoTEI9RVt/rcnf25NoTEI9RVt/rcnf25NoTEE9RVt/rcnf25NoTEI9RVt/rcnf25NoTEI9RVt+rcnf25NoTEE9RVt+rcnf25RoTEE9RVuAs8rg25NoTEI9Rlt+rcnf';

export const useOrderNotifications = ({
  enabled = true,
  soundEnabled = true,
  filterType = "all",
}: UseOrderNotificationsOptions = {}) => {
  const { toast } = useToast();
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback((isUrgent = false) => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio(isUrgent ? URGENT_NOTIFICATION_SOUND : NOTIFICATION_SOUND);
      audio.volume = 0.7;
      audio.play().catch(() => {
        // Fallback for browsers that block autoplay
        console.log("Audio playback blocked - user interaction required");
      });
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, [soundEnabled]);

  const handleNewOrder = useCallback((payload: any) => {
    const order = payload.new;
    
    // Skip if this is the same order we just processed
    if (lastOrderIdRef.current === order.id) return;
    lastOrderIdRef.current = order.id;

    // Filter by order type if needed
    if (filterType === "kitchen" && order.order_type === "bar_only") return;
    if (filterType === "bar" && order.order_type !== "bar_only" && order.order_type !== "dine_in") return;

    setNewOrderCount(prev => prev + 1);
    playNotificationSound();
    
    toast({
      title: "🔔 New Order!",
      description: `Order ${order.order_number} has been placed.`,
      duration: 5000,
    });

    // Clear count after animation
    setTimeout(() => setNewOrderCount(0), 3000);
  }, [filterType, playNotificationSound, toast]);

  const handleStatusChange = useCallback((payload: any) => {
    const order = payload.new;
    const oldOrder = payload.old;
    
    // Only notify on specific status changes
    if (order.status === "ready" && oldOrder?.status !== "ready") {
      playNotificationSound();
      toast({
        title: "✅ Order Ready!",
        description: `Order ${order.order_number} is ready for pickup.`,
        duration: 5000,
      });
    }
  }, [playNotificationSound, toast]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        handleNewOrder
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        handleStatusChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, handleNewOrder, handleStatusChange]);

  return {
    newOrderCount,
    playNotificationSound,
  };
};