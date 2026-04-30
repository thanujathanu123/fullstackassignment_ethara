const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Project = require('./models/projectModel');
const User = require('./models/userModel');
const { registerIo } = require('./services/realtimeService');

const initializeSocket = (server, allowedOrigins) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);

      if (!user) {
        return next(new Error('Invalid authentication token'));
      }

      socket.user = user;
      return next();
    } catch {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.user.id}`);

    try {
      const projectIds = await Project.findProjectIdsForUser(socket.user.id);
      projectIds.forEach((projectId) => socket.join(`project:${projectId}`));
    } catch (error) {
      socket.emit('realtime:error', { message: 'Unable to join project updates' });
    }

    socket.on('subscribe:project', async (projectId) => {
      const membership = await Project.findMembership(projectId, socket.user.id);

      if (membership) {
        socket.join(`project:${projectId}`);
      }
    });
  });

  registerIo(io);
  return io;
};

module.exports = initializeSocket;
