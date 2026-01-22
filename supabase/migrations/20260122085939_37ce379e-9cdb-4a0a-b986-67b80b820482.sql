-- Create staff_users table for local authentication (non-Supabase Auth users)
CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  email text,
  role app_role NOT NULL DEFAULT 'cashier',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- Add index for faster lookups
CREATE INDEX idx_staff_users_username ON public.staff_users(username);
CREATE INDEX idx_staff_users_role ON public.staff_users(role);

-- Enable RLS
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Only super_admin and managers can manage staff users
CREATE POLICY "Admins can manage staff users"
ON public.staff_users
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Staff can view their own record (for profile display)
CREATE POLICY "Staff can view own record"
ON public.staff_users
FOR SELECT
USING (id::text = current_setting('app.current_staff_id', true));

-- Update cashier_bar_assignments to support staff_users
ALTER TABLE public.cashier_bar_assignments 
ADD COLUMN staff_user_id uuid REFERENCES public.staff_users(id) ON DELETE CASCADE;

-- Function to verify staff password (uses pgcrypto)
CREATE OR REPLACE FUNCTION public.verify_staff_password(p_username text, p_password text)
RETURNS TABLE(staff_id uuid, staff_name text, staff_role app_role, staff_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff public.staff_users%ROWTYPE;
BEGIN
  SELECT * INTO v_staff
  FROM public.staff_users
  WHERE username = LOWER(p_username) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Verify password using pgcrypto crypt
  IF v_staff.password_hash = crypt(p_password, v_staff.password_hash) THEN
    -- Update last login
    UPDATE public.staff_users SET last_login_at = now() WHERE id = v_staff.id;
    
    RETURN QUERY SELECT v_staff.id, v_staff.full_name, v_staff.role, v_staff.email;
  END IF;
  
  RETURN;
END;
$$;

-- Function to create staff user with hashed password
CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_username text,
  p_password text,
  p_full_name text,
  p_email text DEFAULT NULL,
  p_role app_role DEFAULT 'cashier'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_new_staff_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only admins can create staff
  IF NOT (has_role(v_user_id, 'super_admin'::app_role) OR has_role(v_user_id, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create staff users';
  END IF;
  
  -- Check if username exists
  IF EXISTS (SELECT 1 FROM public.staff_users WHERE username = LOWER(p_username)) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;
  
  -- Create staff user with hashed password
  INSERT INTO public.staff_users (username, password_hash, full_name, email, role, created_by)
  VALUES (
    LOWER(p_username),
    crypt(p_password, gen_salt('bf')),
    p_full_name,
    p_email,
    p_role,
    v_user_id
  )
  RETURNING id INTO v_new_staff_id;
  
  RETURN v_new_staff_id;
END;
$$;

-- Function to update staff password
CREATE OR REPLACE FUNCTION public.update_staff_password(p_staff_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only admins can reset passwords
  IF NOT (has_role(v_user_id, 'super_admin'::app_role) OR has_role(v_user_id, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.staff_users
  SET password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  WHERE id = p_staff_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get staff role for RLS (similar to has_role but for staff_users)
CREATE OR REPLACE FUNCTION public.staff_has_role(p_staff_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE id = p_staff_id AND role = p_role AND is_active = true
  );
$$;