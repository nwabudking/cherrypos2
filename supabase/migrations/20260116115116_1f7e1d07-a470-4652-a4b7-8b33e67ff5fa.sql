-- Enable realtime for bar_to_bar_transfers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_to_bar_transfers;

-- Set REPLICA IDENTITY to FULL for complete row data in updates
ALTER TABLE public.bar_to_bar_transfers REPLICA IDENTITY FULL;