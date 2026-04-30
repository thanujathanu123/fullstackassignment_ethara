let io;

const registerIo = (socketServer) => {
  io = socketServer;
};

const emitProjectEvent = (projectId, type, payload = {}) => {
  if (!io || !projectId) {
    return;
  }

  io.to(`project:${projectId}`).emit('project:event', {
    projectId,
    type,
    ...payload
  });
};

const emitUserEvent = (userId, type, payload = {}) => {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit('dashboard:update', {
    userId,
    type,
    ...payload
  });
};

module.exports = {
  emitProjectEvent,
  emitUserEvent,
  registerIo
};
