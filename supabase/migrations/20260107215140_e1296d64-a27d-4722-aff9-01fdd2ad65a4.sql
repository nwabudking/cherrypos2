-- Create bars table
CREATE TABLE public.bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on bars
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

-- Create bar_inventory table (inventory per bar)
CREATE TABLE public.bar_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id uuid NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock_level numeric NOT NULL DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(bar_id, inventory_item_id)
);

-- Enable RLS on bar_inventory
ALTER TABLE public.bar_inventory ENABLE ROW LEVEL SECURITY;

-- Create inventory_transfers table (store to bar transfers)
CREATE TABLE public.inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'store',
  source_bar_id uuid REFERENCES public.bars(id),
  destination_bar_id uuid NOT NULL REFERENCES public.bars(id),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  quantity numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  transferred_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on inventory_transfers
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- Create audit_logs table for corrections and important actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  original_data jsonb,
  new_data jsonb,
  reason text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add bar_id to orders table to track which bar the order came from
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bar_id uuid REFERENCES public.bars(id);

-- Create updated_at trigger for new tables
CREATE TRIGGER update_bars_updated_at
  BEFORE UPDATE ON public.bars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bar_inventory_updated_at
  BEFORE UPDATE ON public.bar_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for bars
CREATE POLICY "Staff can view bars" ON public.bars
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role) OR
    has_role(auth.uid(), 'store_user'::app_role) OR
    has_role(auth.uid(), 'cashier'::app_role) OR
    has_role(auth.uid(), 'bar_staff'::app_role)
  );

CREATE POLICY "Admins can manage bars" ON public.bars
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- RLS Policies for bar_inventory
CREATE POLICY "Staff can view bar inventory" ON public.bar_inventory
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role) OR
    has_role(auth.uid(), 'store_user'::app_role) OR
    has_role(auth.uid(), 'bar_staff'::app_role) OR
    has_role(auth.uid(), 'cashier'::app_role)
  );

CREATE POLICY "Store staff can manage bar inventory" ON public.bar_inventory
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role)
  );

-- RLS Policies for inventory_transfers
CREATE POLICY "Staff can view transfers" ON public.inventory_transfers
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role) OR
    has_role(auth.uid(), 'store_user'::app_role)
  );

CREATE POLICY "Store admins can create transfers" ON public.inventory_transfers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role)
  );

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Staff can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'store_admin'::app_role) OR
    has_role(auth.uid(), 'cashier'::app_role)
  );

-- Create function to transfer inventory from store to bar
CREATE OR REPLACE FUNCTION public.transfer_store_to_bar(
  p_bar_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_stock numeric;
  v_bar_stock numeric;
  v_transfer_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user has permission
  IF NOT (has_role(v_user_id, 'super_admin'::app_role) OR has_role(v_user_id, 'manager'::app_role) OR has_role(v_user_id, 'store_admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Only store admins can transfer inventory';
  END IF;
  
  -- Get current store inventory
  SELECT current_stock INTO v_store_stock
  FROM public.inventory_items
  WHERE id = p_inventory_item_id;
  
  IF v_store_stock IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  
  IF v_store_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient store stock. Available: %, Requested: %', v_store_stock, p_quantity;
  END IF;
  
  -- Deduct from store inventory
  UPDATE public.inventory_items
  SET current_stock = current_stock - p_quantity
  WHERE id = p_inventory_item_id;
  
  -- Add to bar inventory (upsert)
  INSERT INTO public.bar_inventory (bar_id, inventory_item_id, current_stock)
  VALUES (p_bar_id, p_inventory_item_id, p_quantity)
  ON CONFLICT (bar_id, inventory_item_id)
  DO UPDATE SET current_stock = bar_inventory.current_stock + p_quantity;
  
  -- Record the transfer
  INSERT INTO public.inventory_transfers (
    source_type, destination_bar_id, inventory_item_id, 
    quantity, status, notes, transferred_by, completed_at
  )
  VALUES (
    'store', p_bar_id, p_inventory_item_id,
    p_quantity, 'completed', p_notes, v_user_id, now()
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create audit log
  INSERT INTO public.audit_logs (
    action_type, entity_type, entity_id, 
    new_data, performed_by
  )
  VALUES (
    'transfer', 'inventory', p_inventory_item_id,
    jsonb_build_object(
      'transfer_id', v_transfer_id,
      'bar_id', p_bar_id,
      'quantity', p_quantity,
      'previous_store_stock', v_store_stock,
      'new_store_stock', v_store_stock - p_quantity
    ),
    v_user_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'message', 'Transfer completed successfully'
  );
END;
$$;

-- Create function to deduct bar inventory on POS sale
CREATE OR REPLACE FUNCTION public.deduct_bar_inventory(
  p_bar_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock numeric;
BEGIN
  -- Get current bar stock
  SELECT current_stock INTO v_current_stock
  FROM public.bar_inventory
  WHERE bar_id = p_bar_id AND inventory_item_id = p_inventory_item_id;
  
  IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
    RETURN false;
  END IF;
  
  -- Deduct stock
  UPDATE public.bar_inventory
  SET current_stock = current_stock - p_quantity
  WHERE bar_id = p_bar_id AND inventory_item_id = p_inventory_item_id;
  
  RETURN true;
END;
$$;

-- Create function to check bar stock availability
CREATE OR REPLACE FUNCTION public.check_bar_stock(
  p_bar_id uuid,
  p_inventory_item_id uuid,
  p_quantity numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT current_stock >= p_quantity
     FROM public.bar_inventory
     WHERE bar_id = p_bar_id AND inventory_item_id = p_inventory_item_id),
    false
  );
$$;