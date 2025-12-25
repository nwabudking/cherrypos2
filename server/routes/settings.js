import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get restaurant settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await query('SELECT * FROM restaurant_settings LIMIT 1');
    res.json(settings[0] || null);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update restaurant settings
router.patch('/', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo } = req.body;

    // Check if settings exist
    const existing = await query('SELECT id FROM restaurant_settings LIMIT 1');
    
    if (existing.length === 0) {
      // Create new settings
      const { v4: uuidv4 } = await import('uuid');
      await query(
        `INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo]
      );
    } else {
      // Update existing
      await query(
        `UPDATE restaurant_settings SET name = ?, tagline = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, logo_url = ?, currency = ?, timezone = ?, receipt_footer = ?, receipt_show_logo = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo, existing[0].id]
      );
    }

    const settings = await query('SELECT * FROM restaurant_settings LIMIT 1');
    res.json(settings[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
