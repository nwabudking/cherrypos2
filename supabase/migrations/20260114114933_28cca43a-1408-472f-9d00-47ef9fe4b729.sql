-- Add expiry_date column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN expiry_date DATE;

-- Add expiry_date to bar_inventory
ALTER TABLE public.bar_inventory  
ADD COLUMN expiry_date DATE;

-- Create bar_to_bar_transfers table for tracking transfers with approval workflow
CREATE TABLE public.bar_to_bar_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  destination_bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  requested_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_bar_to_bar_transfers_status ON public.bar_to_bar_transfers(status);
CREATE INDEX idx_bar_to_bar_transfers_destination ON public.bar_to_bar_transfers(destination_bar_id);
CREATE INDEX idx_bar_to_bar_transfers_source ON public.bar_to_bar_transfers(source_bar_id);

-- Enable RLS
ALTER TABLE public.bar_to_bar_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bar_to_bar_transfers
CREATE POLICY "Authenticated users can view transfers" 
ON public.bar_to_bar_transfers 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create transfers" 
ON public.bar_to_bar_transfers 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transfers" 
ON public.bar_to_bar_transfers 
FOR UPDATE 
TO authenticated
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_bar_to_bar_transfers_updated_at
BEFORE UPDATE ON public.bar_to_bar_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for expiry date on inventory items
CREATE INDEX idx_inventory_items_expiry ON public.inventory_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- Create index for expiry date on bar inventory
CREATE INDEX idx_bar_inventory_expiry ON public.bar_inventory(expiry_date) WHERE expiry_date IS NOT NULL;