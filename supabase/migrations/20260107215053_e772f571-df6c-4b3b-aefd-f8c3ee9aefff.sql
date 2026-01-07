-- Add new roles to the app_role enum
-- Note: These need to be committed before use in policies
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_admin';