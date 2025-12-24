-- Drop existing SELECT policy and recreate with cashier role included
DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory_items;

CREATE POLICY "Staff can view inventory" 
ON public.inventory_items 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'inventory_officer'::app_role) OR 
  has_role(auth.uid(), 'bar_staff'::app_role) OR 
  has_role(auth.uid(), 'kitchen_staff'::app_role) OR
  has_role(auth.uid(), 'cashier'::app_role)
);