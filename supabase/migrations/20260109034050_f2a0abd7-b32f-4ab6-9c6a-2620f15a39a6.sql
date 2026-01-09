-- Create cashier bar assignments table
CREATE TABLE public.cashier_bar_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_id uuid NOT NULL REFERENCES bars(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, bar_id)
);

-- Enable RLS
ALTER TABLE public.cashier_bar_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cashier bar assignments
CREATE POLICY "Staff can view assignments"
ON public.cashier_bar_assignments
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'cashier'::app_role) OR
  has_role(auth.uid(), 'bar_staff'::app_role)
);

CREATE POLICY "Admins can manage assignments"
ON public.cashier_bar_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add selling_price column to inventory_items if not exists
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS selling_price numeric;

-- Create trigger for updated_at
CREATE TRIGGER update_cashier_bar_assignments_updated_at
  BEFORE UPDATE ON public.cashier_bar_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();