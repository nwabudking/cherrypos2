import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all inventory items
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { active_only, low_stock } = req.query;
    
    let sql = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];

    if (active_only === 'true') {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY name';

    const items = await query(sql, params);
    
    let result = items;
    if (low_stock === 'true') {
      result = items.filter(i => i.current_stock <= i.min_stock_level);
    }

    res.json(result);
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Create inventory item
router.post('/', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id } = req.body;
    const id = uuidv4();

    await query(
      `INSERT INTO inventory_items (id, name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, name, category || null, unit || 'pcs', current_stock || 0, min_stock_level || 0, cost_per_unit || null, supplier || null, supplier_id || null]
    );

    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.patch('/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active } = req.body;

    await query(
      `UPDATE inventory_items SET name = ?, category = ?, unit = ?, current_stock = ?, min_stock_level = ?, cost_per_unit = ?, supplier = ?, supplier_id = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active, id]
    );

    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete (soft) inventory item
router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE inventory_items SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Stock movement
router.post('/movements', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { inventory_item_id, movement_type, quantity, notes } = req.body;

    // Get current stock
    const items = await query('SELECT current_stock FROM inventory_items WHERE id = ?', [inventory_item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const previousStock = items[0].current_stock;
    let newStock;

    if (movement_type === 'in') {
      newStock = previousStock + quantity;
    } else if (movement_type === 'out') {
      newStock = previousStock - quantity;
    } else {
      newStock = quantity; // adjustment
    }

    // Create movement record
    const movementId = uuidv4();
    await query(
      `INSERT INTO stock_movements (id, inventory_item_id, movement_type, quantity, previous_stock, new_stock, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [movementId, inventory_item_id, movement_type, quantity, previousStock, newStock, notes || null, req.user.id]
    );

    // Update stock
    await query(
      'UPDATE inventory_items SET current_stock = ?, updated_at = NOW() WHERE id = ?',
      [newStock, inventory_item_id]
    );

    res.json({ success: true, newStock });
  } catch (error) {
    console.error('Stock movement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
});

// Get stock movements
router.get('/movements', authMiddleware, async (req, res) => {
  try {
    const { inventory_item_id } = req.query;
    
    let sql = 'SELECT * FROM stock_movements WHERE 1=1';
    const params = [];

    if (inventory_item_id) {
      sql += ' AND inventory_item_id = ?';
      params.push(inventory_item_id);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const movements = await query(sql, params);
    res.json(movements);
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

export default router;
