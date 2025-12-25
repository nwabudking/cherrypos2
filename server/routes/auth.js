import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// Sign in
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const users = await query(
      'SELECT u.*, ur.role FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || 'cashier',
    });

    // Get profile
    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [user.id]);
    const profile = profiles[0] || null;

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      role: user.role || 'cashier',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const users = await query(
      'SELECT u.id, u.email, ur.role FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id WHERE u.id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [req.user.id]);

    res.json({
      user: users[0],
      profile: profiles[0] || null,
      role: users[0].role || 'cashier',
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
