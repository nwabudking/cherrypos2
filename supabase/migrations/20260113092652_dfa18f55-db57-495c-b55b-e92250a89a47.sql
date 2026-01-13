-- Create function to sync prices from inventory_items to menu_items
CREATE OR REPLACE FUNCTION public.sync_inventory_to_menu_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update linked menu items when inventory prices change
  UPDATE public.menu_items
  SET 
    cost_price = NEW.cost_per_unit,
    price = COALESCE(NEW.selling_price, price),
    updated_at = now()
  WHERE inventory_item_id = NEW.id
    AND (cost_price IS DISTINCT FROM NEW.cost_per_unit 
         OR (NEW.selling_price IS NOT NULL AND price IS DISTINCT FROM NEW.selling_price));
  
  RETURN NEW;
END;
$function$;

-- Create function to sync prices from menu_items to inventory_items
CREATE OR REPLACE FUNCTION public.sync_menu_to_inventory_prices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync if menu item is linked to an inventory item
  IF NEW.inventory_item_id IS NOT NULL THEN
    UPDATE public.inventory_items
    SET 
      cost_per_unit = NEW.cost_price,
      selling_price = NEW.price,
      updated_at = now()
    WHERE id = NEW.inventory_item_id
      AND (cost_per_unit IS DISTINCT FROM NEW.cost_price 
           OR selling_price IS DISTINCT FROM NEW.price);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on inventory_items
DROP TRIGGER IF EXISTS sync_inventory_prices_to_menu ON public.inventory_items;
CREATE TRIGGER sync_inventory_prices_to_menu
AFTER UPDATE OF cost_per_unit, selling_price ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_to_menu_prices();

-- Create trigger on menu_items
DROP TRIGGER IF EXISTS sync_menu_prices_to_inventory ON public.menu_items;
CREATE TRIGGER sync_menu_prices_to_inventory
AFTER UPDATE OF cost_price, price ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_menu_to_inventory_prices();

-- Also sync on insert when linking menu item to inventory
DROP TRIGGER IF EXISTS sync_menu_prices_on_link ON public.menu_items;
CREATE TRIGGER sync_menu_prices_on_link
AFTER INSERT OR UPDATE OF inventory_item_id ON public.menu_items
FOR EACH ROW
WHEN (NEW.inventory_item_id IS NOT NULL)
EXECUTE FUNCTION public.sync_menu_to_inventory_prices();