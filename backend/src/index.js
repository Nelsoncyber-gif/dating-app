require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');
const conversationRoutes = require('./routes/conversations');
const postRoutes = require('./routes/posts');
const communityRoutes = require('./routes/communities');
const safetyRoutes = require('./routes/safety');
const profileRoutes = require('./routes/profile');
const storyRoutes = require('./routes/stories');
const verificationRoutes = require('./routes/verification');
const notificationRoutes = require('./routes/notifications');
const socialRoutes = require('./routes/social');
const premiumRoutes = require('./routes/premium');
const eventRoutes = require('./routes/events');
const dateRoutes = require('./routes/dates');
const pushRoutes = require('./routes/push');
const { registerChatHandlers } = require('./sockets/chat');

const app = express();

// Trust Railway's reverse proxy so express-rate-limit and req.ip work correctly
app.set('trust proxy', 1);

const server = http.createServer(app);

// Security: CORS — use specific origin in production, not wildcard
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'], credentials: true },
});

// Makes the Socket.IO instance available to REST controllers (via req.app.locals.io)
// so actions like matching or liking a post can push a live notification,
// not just messages sent through the socket connection itself.
app.locals.io = io;

// Security: HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet());

app.use(cors({ origin: allowedOrigin, credentials: true }));

// Security: Rate limiting — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

// Stricter rate limit for auth endpoints (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Premium webhook MUST be mounted before express.json() so Stripe signature verification works
app.use('/api/premium', premiumRoutes);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api', matchRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dates', dateRoutes);
app.use('/api/push', pushRoutes);

// Central error handler - keeps controllers free of try/catch boilerplate for unexpected errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

registerChatHandlers(io);

// Catch unhandled promise rejections so they don't crash the process
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledPromiseRejection:', reason);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
