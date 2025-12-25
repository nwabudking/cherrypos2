import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getConnection } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper: Generate order number
const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
  
  const rows = await query(
    `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()`
  );
  const count = (rows[0]?.count || 0) + 1;
  
  return `ORD-${dateStr}-${String(count).padStart(4, '0')}`;
};

// Get all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, order_type, search, date } = req.query;
    
    let sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'payment_method', p.payment_method,
            'amount', p.amount,
            'status', p.status
          )
        ) FROM payments p WHERE p.order_id = o.id) as payments
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (order_type && order_type !== 'all') {
      sql += ' AND o.order_type = ?';
      params.push(order_type);
    }

    if (search) {
      sql += ' AND o.order_number LIKE ?';
      params.push(`%${search}%`);
    }

    if (date) {
      sql += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT 500';

    const orders = await query(sql, params);
    
    // Parse JSON fields
    const result = orders.map(o => ({
      ...o,
      order_items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
      payments: o.payments ? JSON.parse(o.payments).filter(p => p.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders by date range (for dashboard/reports)
router.get('/range', authMiddleware, async (req, res) => {
  try {
    const { start, end, status } = req.query;
    
    let sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'payment_method', p.payment_method,
            'amount', p.amount,
            'status', p.status
          )
        ) FROM payments p WHERE p.order_id = o.id) as payments
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at >= ? AND o.created_at <= ?
    `;
    const params = [start, end];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const orders = await query(sql, params);
    
    const result = orders.map(o => ({
      ...o,
      order_items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
      payments: o.payments ? JSON.parse(o.payments).filter(p => p.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get orders range error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
router.post('/', authMiddleware, async (req, res) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const { order_type, table_number, cart, payment_method } = req.body;

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = subtotal;

    // Generate order number
    const orderNumber = await generateOrderNumber();
    const orderId = uuidv4();

    // Validate stock for tracked items
    for (const cartItem of cart) {
      if (cartItem.track_inventory && cartItem.inventory_item_id) {
        const [inv] = await conn.execute(
          'SELECT current_stock FROM inventory_items WHERE id = ?',
          [cartItem.inventory_item_id]
        );
        if (inv[0] && inv[0].current_stock < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${cartItem.name}". Available: ${inv[0].current_stock}`);
        }
      }
    }

    // Create order
    await conn.execute(
      `INSERT INTO orders (id, order_number, order_type, table_number, subtotal, vat_amount, service_charge, discount_amount, total_amount, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 'completed', ?, NOW(), NOW())`,
      [orderId, orderNumber, order_type, table_number || null, subtotal, totalAmount, req.user.id]
    );

    // Create order items
    for (const item of cart) {
      await conn.execute(
        `INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), orderId, item.menuItemId || null, item.name, item.quantity, item.price, item.price * item.quantity, item.notes || null]
      );

      // Deduct stock for tracked items
      if (item.track_inventory && item.inventory_item_id) {
        const [inv] = await conn.execute(
          'SELECT current_stock FROM inventory_items WHERE id = ?',
          [item.inventory_item_id]
        );
        const previousStock = inv[0].current_stock;
        const newStock = previousStock - item.quantity;

        await conn.execute(
          'UPDATE inventory_items SET current_stock = ?, updated_at = NOW() WHERE id = ?',
          [newStock, item.inventory_item_id]
        );

        // Log stock movement
        await conn.execute(
          `INSERT INTO stock_movements (id, inventory_item_id, movement_type, quantity, previous_stock, new_stock, notes, reference, created_by, created_at)
           VALUES (?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
          [uuidv4(), item.inventory_item_id, item.quantity, previousStock, newStock, `Sold via POS - Order ${orderNumber}`, orderId, req.user.id]
        );
      }
    }

    // Create payment
    await conn.execute(
      `INSERT INTO payments (id, order_id, payment_method, amount, status, created_by, created_at)
       VALUES (?, ?, ?, ?, 'completed', ?, NOW())`,
      [uuidv4(), orderId, payment_method, totalAmount, req.user.id]
    );

    await conn.commit();

    // Fetch created order
    const [order] = await query('SELECT * FROM orders WHERE id = ?', [orderId]);

    res.json(order);
  } catch (error) {
    await conn.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    conn.release();
  }
});

// Update order status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    const orders = await query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(orders[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
