import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCashierAssignment } from "@/hooks/useCashierAssignment";
import { useQueryClient } from "@tanstack/react-query";
import { barsKeys } from "@/hooks/useBars";

interface UseTransferNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
  userId?: string;
}

const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC8EF3GVyvPr2JdhSjxAaYy9s6VhVkdXj8bg2L9tdEQ5RWV+rsvW24NnRDc/XXqivcfWm3JdSUM9RVWBqMbf2ZVnTEE9RVt+rcnf25RoTEE9RVuAs8rg25NoTEI9Rlt+rcnf25NoTEI9RVt+rcnf25NoTEI9RVt/rcnf25NoTEI9RVt/rcnf25NoTEE9RVt/rcnf';

export const useTransferNotifications = ({
  enabled = true,
  soundEnabled = true,
  userId,
}: UseTransferNotificationsOptions = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const lastTransferIdRef = useRef<string | null>(null);
  
  const assignmentQuery = useCashierAssignment(userId || "");
  const assignedBarId = assignmentQuery.data?.bar_id;

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio(NOTIFICATION_SOUND);
      audio.volume = 0.7;
      audio.play().catch(() => {
        console.log("Audio playback blocked - user interaction required");
      });
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, [soundEnabled]);

  const handleNewTransfer = useCallback(async (payload: any) => {
    const transfer = payload.new;
    
    // Skip if this is the same transfer we just processed
    if (lastTransferIdRef.current === transfer.id) return;
    
    // Only notify if this transfer is for our bar
    if (!assignedBarId || transfer.destination_bar_id !== assignedBarId) return;
    
    // Only notify for pending transfers
    if (transfer.status !== 'pending') return;
    
    lastTransferIdRef.current = transfer.id;
    
    // Fetch the transfer details for the notification
    const { data: transferDetails } = await supabase
      .from('bar_to_bar_transfers')
      .select(`
        *,
        source_bar:bars!source_bar_id(name),
        inventory_item:inventory_items(name, unit)
      `)
      .eq('id', transfer.id)
      .single();
    
    setPendingCount(prev => prev + 1);
    playNotificationSound();
    
    const itemName = transferDetails?.inventory_item?.name || 'item';
    const sourceBar = transferDetails?.source_bar?.name || 'another bar';
    const quantity = transfer.quantity;
    
    toast({
      title: "📦 New Transfer Request!",
      description: `${sourceBar} is requesting to transfer ${quantity} ${itemName} to your bar.`,
      duration: 8000,
    });

    // Invalidate queries to refresh the pending transfers list
    queryClient.invalidateQueries({ queryKey: barsKeys.pendingTransfers(assignedBarId) });
    queryClient.invalidateQueries({ queryKey: barsKeys.barToBarTransfers() });
    
    // Clear count after animation
    setTimeout(() => setPendingCount(0), 3000);
  }, [assignedBarId, playNotificationSound, toast, queryClient]);

  const handleTransferUpdate = useCallback((payload: any) => {
    const transfer = payload.new;
    const oldTransfer = payload.old;
    
    // Notify when a transfer we requested is accepted or rejected
    if (transfer.status !== oldTransfer?.status) {
      if (transfer.status === 'completed' || transfer.status === 'accepted') {
        toast({
          title: "✅ Transfer Accepted!",
          description: "Your transfer request has been accepted.",
          duration: 5000,
        });
        playNotificationSound();
      } else if (transfer.status === 'rejected') {
        toast({
          title: "❌ Transfer Rejected",
          description: "Your transfer request was rejected.",
          duration: 5000,
          variant: "destructive",
        });
      }
      
      // Invalidate queries
      if (assignedBarId) {
        queryClient.invalidateQueries({ queryKey: barsKeys.pendingTransfers(assignedBarId) });
      }
      queryClient.invalidateQueries({ queryKey: barsKeys.barToBarTransfers() });
      queryClient.invalidateQueries({ queryKey: barsKeys.all });
    }
  }, [toast, playNotificationSound, queryClient, assignedBarId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const channel = supabase
      .channel('transfer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bar_to_bar_transfers',
        },
        handleNewTransfer
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bar_to_bar_transfers',
        },
        handleTransferUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, userId, handleNewTransfer, handleTransferUpdate]);

  return {
    pendingCount,
    playNotificationSound,
    assignedBarId,
  };
};
