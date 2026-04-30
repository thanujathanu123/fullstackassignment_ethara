require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const rateLimit = require('express-rate-limit');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const initializeSocket = require('./socket');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim())
  : true;

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/invites', inviteRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    message: error.status ? error.message : 'Internal server error'
  });
});

const server = http.createServer(app);
initializeSocket(server, allowedOrigins);

server.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on port ${port}`);
});
