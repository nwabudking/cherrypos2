import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import ordersRoutes from './routes/orders.js';
import menuRoutes from './routes/menu.js';
import inventoryRoutes from './routes/inventory.js';
import staffRoutes from './routes/staff.js';
import suppliersRoutes from './routes/suppliers.js';
import settingsRoutes from './routes/settings.js';
import profilesRoutes from './routes/profiles.js';

import { getPool } from './db/pool.js';
import { verifyToken } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected clients
const connectedClients = new Map();

// Socket.IO authentication and connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = verifyToken(token);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.email}`);
  connectedClients.set(socket.user.id, socket);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.email}`);
    connectedClients.delete(socket.user.id);
  });
});

// Helper to emit events to all connected clients
export const emitEvent = (event, data) => {
  io.emit(event, data);
};

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profiles', profilesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;

// Test database connection before starting
const startServer = async () => {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    console.log('Database connection successful');
    conn.release();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Cherry Dining & Lounge POS Server                     ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://0.0.0.0:${PORT}                   ║
║  API endpoint: http://localhost:${PORT}/api                  ║
║                                                           ║
║  To access from other devices on your network:            ║
║  http://<YOUR_LOCAL_IP>:${PORT}                              ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
