require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Connect to MongoDB
connectDB();

// Connect to Redis (optional – graceful fallback if not available)
connectRedis();

const server = http.createServer(app);

// ── Socket.io Real-time Setup ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // Join a team-specific room for scoped notifications
  socket.on('join_team', (team) => {
    socket.join(team);
    console.log(`  └─ ${socket.id} joined team room: ${team}`);
    socket.emit('joined', { team, message: `Joined room: ${team}` });
  });

  socket.on('disconnect', () => {
    console.log(`⚡ Socket disconnected: ${socket.id}`);
  });
});

// Make io globally accessible to controllers
global.io = io;

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 API Docs available at http://localhost:${PORT}/api-docs\n`);
});

// ── Unhandled Rejections ──────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
