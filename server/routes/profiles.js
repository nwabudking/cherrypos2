import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [id]);
    res.json(profiles[0] || null);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only allow users to update their own profile
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Cannot update other users profile' });
    }

    const { full_name, avatar_url } = req.body;

    await query(
      'UPDATE profiles SET full_name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [full_name, avatar_url, id]
    );

    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [id]);
    res.json(profiles[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
