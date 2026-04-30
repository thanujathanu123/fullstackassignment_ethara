import { io } from 'socket.io-client';

let socket;

const apiBaseUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

export const connectRealtime = (token) => {
  if (!token) {
    return null;
  }

  if (socket) {
    return socket;
  }

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  return socket;
};

export const disconnectRealtime = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
