import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all suppliers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { active_only } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE 1=1';
    
    if (active_only === 'true') {
      sql += ' AND is_active = 1';
    }
    
    sql += ' ORDER BY name';
    
    const suppliers = await query(sql);
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Create supplier
router.post('/', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, notes } = req.body;
    const id = uuidv4();

    await query(
      `INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, name, contact_person || null, phone || null, email || null, address || null, notes || null]
    );

    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.json(suppliers[0]);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Update supplier
router.patch('/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, notes, is_active } = req.body;

    await query(
      `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, notes = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, contact_person, phone, email, address, notes, is_active, id]
    );

    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.json(suppliers[0]);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// Delete (soft) supplier
router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE suppliers SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
