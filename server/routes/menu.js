import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const { active_only } = req.query;
    let sql = 'SELECT * FROM menu_categories';
    if (active_only === 'true') {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY sort_order, name';
    
    const categories = await query(sql);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, sort_order, is_active } = req.body;
    const id = uuidv4();

    await query(
      'INSERT INTO menu_categories (id, name, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, name, sort_order || 0, is_active !== false]
    );

    const categories = await query('SELECT * FROM menu_categories WHERE id = ?', [id]);
    res.json(categories[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.patch('/categories/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, is_active } = req.body;

    await query(
      'UPDATE menu_categories SET name = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, sort_order, is_active, id]
    );

    const categories = await query('SELECT * FROM menu_categories WHERE id = ?', [id]);
    res.json(categories[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM menu_categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get all menu items
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { category_id, active_only } = req.query;
    
    let sql = `
      SELECT mi.*, mc.name as category_name,
        ii.id as inv_id, ii.current_stock, ii.min_stock_level, ii.unit
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN inventory_items ii ON mi.inventory_item_id = ii.id
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true') {
      sql += ' AND mi.is_active = 1';
    }

    if (category_id) {
      sql += ' AND mi.category_id = ?';
      params.push(category_id);
    }

    sql += ' ORDER BY mi.name';

    const items = await query(sql, params);
    
    // Format response to match Supabase structure
    const result = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price,
      image_url: item.image_url,
      is_active: !!item.is_active,
      is_available: !!item.is_available,
      category_id: item.category_id,
      inventory_item_id: item.inventory_item_id,
      track_inventory: !!item.track_inventory,
      created_at: item.created_at,
      updated_at: item.updated_at,
      menu_categories: item.category_name ? { name: item.category_name } : null,
      inventory_items: item.inv_id ? {
        id: item.inv_id,
        current_stock: item.current_stock,
        min_stock_level: item.min_stock_level,
        unit: item.unit,
      } : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create menu item
router.post('/items', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory } = req.body;
    const id = uuidv4();

    await query(
      `INSERT INTO menu_items (id, name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, description || null, price, cost_price || null, category_id || null, image_url || null, is_active !== false, is_available !== false, inventory_item_id || null, track_inventory || false]
    );

    const items = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
router.patch('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory } = req.body;

    await query(
      `UPDATE menu_items SET name = ?, description = ?, price = ?, cost_price = ?, category_id = ?, image_url = ?, is_active = ?, is_available = ?, inventory_item_id = ?, track_inventory = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory, id]
    );

    const items = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Get menu items count
router.get('/items/count', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM menu_items WHERE is_active = 1');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get menu count error:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

export default router;
