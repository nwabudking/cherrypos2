
-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

-- Allow authenticated users to upload menu images
CREATE POLICY "Staff can upload menu images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager'))
  );

-- Allow public to view menu images
CREATE POLICY "Anyone can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

-- Allow staff to update/delete menu images
CREATE POLICY "Staff can update menu images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Staff can delete menu images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'menu-images' AND
    (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'manager'))
  );
