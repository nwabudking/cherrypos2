import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all staff (profiles with roles)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const staff = await query(`
      SELECT p.*, ur.role 
      FROM profiles p 
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      ORDER BY p.created_at DESC
    `);
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Create staff member
router.post('/', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, NOW())',
      [userId, email, passwordHash]
    );

    // Create profile
    await query(
      'INSERT INTO profiles (id, email, full_name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [userId, email, full_name]
    );

    // Assign role
    await query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW())',
      [uuidv4(), userId, role || 'cashier']
    );

    const staff = await query(`
      SELECT p.*, ur.role 
      FROM profiles p 
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = ?
    `, [userId]);

    res.json(staff[0]);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// Update staff member
router.patch('/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role } = req.body;

    // Update profile
    await query(
      'UPDATE profiles SET full_name = ?, updated_at = NOW() WHERE id = ?',
      [full_name, id]
    );

    // Update role
    const existingRole = await query('SELECT id FROM user_roles WHERE user_id = ?', [id]);
    if (existingRole.length > 0) {
      await query('UPDATE user_roles SET role = ? WHERE user_id = ?', [role, id]);
    } else {
      await query(
        'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, NOW())',
        [uuidv4(), id, role]
      );
    }

    const staff = await query(`
      SELECT p.*, ur.role 
      FROM profiles p 
      LEFT JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = ?
    `, [id]);

    res.json(staff[0]);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Delete staff member
router.delete('/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete in order: roles, profiles, users
    await query('DELETE FROM user_roles WHERE user_id = ?', [id]);
    await query('DELETE FROM profiles WHERE id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

export default router;
