require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
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
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});



// Makes the Socket.IO instance available to REST controllers (via req.app.locals.io)
// so actions like matching or liking a post can push a live notification,
// not just messages sent through the socket connection itself.
app.locals.io = io;

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

// Premium webhook MUST be mounted before express.json() so Stripe signature verification works
app.use('/api/premium', premiumRoutes);

app.use(express.json());

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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
