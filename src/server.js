require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

connectDB();

connectRedis();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Task = require('./models/Task');


io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: User not found or deactivated'));
    }

 
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid or expired token'));
  }
});

io.on('connection', async (socket) => {
  const user = socket.user;
  console.log(`Socket connected: ${socket.id} | User: ${user.username} (${user.role} - ${user.team})`);

  if (user.role === 'Admin') {
    socket.join('admins');
    socket.emit('joined', { room: 'admins', message: 'Joined admins room — receiving all task events' });

    const existingTasks = await Task.find({ status: { $in: ['Pending', 'In Progress', 'Overdue'] } })
      .populate('assignedTo', 'username email team')
      .populate('createdBy', 'username email')
      .sort({ team: 1, dueDate: 1 });

    socket.emit('initial_tasks', { team: 'all', count: existingTasks.length, data: existingTasks });

  } else {
    const team = user.team;
    socket.join(team);
    socket.emit('joined', { room: team, message: `Joined team room: ${team}` });
    const existingTasks = await Task.find({
      team,
      status: { $in: ['Pending', 'In Progress', 'Overdue'] },
    })
      .populate('assignedTo', 'username email team')
      .populate('createdBy', 'username email')
      .sort({ dueDate: 1 });

    socket.emit('initial_tasks', { team, count: existingTasks.length, data: existingTasks });
  }

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id} | User: ${user.username}`);
  });
});


global.io = io;

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n Server running on http://localhost:${PORT}`);
  console.log(`API Docs available at http://localhost:${PORT}/api-docs\n`);
});

process.on('unhandledRejection', (err) => {
  console.error(` Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
