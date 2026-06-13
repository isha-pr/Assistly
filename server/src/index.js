require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

// Database & Models
const { connectDB } = require('./db');
const Session = require('./models/Session');
const Participant = require('./models/Participant');
const Message = require('./models/Message');
const Note = require('./models/Note');

// Mediasoup Config
const { createRouter, createWebRtcTransport } = require('./mediasoup');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'assistly_super_secret_jwt_key';

// Configure Multer storage
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// File Upload Endpoint
app.post('/api/sessions/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
  return res.json({
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });
});

// Public endpoint for dashboard stats (unauthenticated, aggregates only)
app.get('/api/public/stats', async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments();
    const activeSessions = await Session.countDocuments({ status: { $in: ['created', 'active'] } });
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const resolutionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 100;
    
    return res.json({
      activeSessions,
      resolutionRate,
    });
  } catch (err) {
    console.error('Failed to query public stats:', err);
    return res.json({ activeSessions: 0, resolutionRate: 100 });
  }
});

// In-Memory WebRTC states (Routers, Transports, Producers, Consumers)
// rooms[sessionId] = {
//   router,
//   participants: {
//     [socketId]: {
//       id: socketId,
//       name: String,
//       role: 'agent' | 'customer',
//       transports: Map[transportId -> transport],
//       producers: Map[producerId -> producer],
//       consumers: Map[consumerId -> consumer]
//     }
//   }
// }
const rooms = {};

// Default Agent login credentials
const DEFAULT_AGENT = {
  id: 'agent-1',
  email: 'agent@assistly.com',
  name: 'Support Agent',
  passwordHash: bcrypt.hashSync('password123', 10),
};

// Default Admin login credentials
const DEFAULT_ADMIN = {
  id: 'admin-1',
  email: 'admin@assistly.com',
  name: 'System Admin',
  passwordHash: bcrypt.hashSync('password123', 10),
};

// Express REST Endpoints

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email === DEFAULT_AGENT.email && bcrypt.compareSync(password, DEFAULT_AGENT.passwordHash)) {
    const token = jwt.sign(
      { userId: DEFAULT_AGENT.id, name: DEFAULT_AGENT.name, role: 'agent' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({
      token,
      user: { id: DEFAULT_AGENT.id, name: DEFAULT_AGENT.name, email: DEFAULT_AGENT.email, role: 'agent' },
    });
  }

  if (email === DEFAULT_ADMIN.email && bcrypt.compareSync(password, DEFAULT_ADMIN.passwordHash)) {
    const token = jwt.sign(
      { userId: DEFAULT_ADMIN.id, name: DEFAULT_ADMIN.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({
      token,
      user: { id: DEFAULT_ADMIN.id, name: DEFAULT_ADMIN.name, email: DEFAULT_ADMIN.email, role: 'admin' },
    });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

// Middleware to verify any authenticated user (agent or admin)
function verifyUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid token.' });
  }
}

// Middleware to verify Admin role only
function verifyAdmin(req, res, next) {
  verifyUser(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
  });
}

// Create support session (Agent-only)
app.post('/api/agent/sessions', verifyUser, async (req, res) => {
  const { issueCategory, customerName } = req.body;
  if (!issueCategory || !customerName) {
    return res.status(400).json({ error: 'Issue category and customer name are required' });
  }
  
  const sessionId = 'session_' + Math.random().toString(36).substring(2, 11);
  
  try {
    // Spin up mediasoup router
    const router = await createRouter();
    
    // Save metadata to MongoDB Atlas
    const sessionDoc = new Session({
      sessionId,
      issueCategory,
      agentId: req.user.userId,
      agentName: req.user.name,
      customerName,
      status: 'created',
      createdAt: new Date(),
    });
    await sessionDoc.save();

    // Track WebRTC session state in memory
    rooms[sessionId] = {
      router,
      participants: {},
    };
    
    return res.status(201).json({
      sessionId,
      issueCategory,
      customerName,
      status: 'created',
      inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/join/${sessionId}`,
    });
  } catch (error) {
    console.error('Failed to create room router:', error);
    return res.status(500).json({ error: 'Failed to create video support session router' });
  }
});

// GET all sessions for the Agent (retrieved from MongoDB)
app.get('/api/agent/sessions', verifyUser, async (req, res) => {
  try {
    const sessionList = await Session.find().sort({ createdAt: -1 });
    return res.json(sessionList);
  } catch (err) {
    console.error('Failed to fetch sessions from MongoDB:', err);
    return res.status(500).json({ error: 'Failed to load sessions from database' });
  }
});

// End support session (Agent-only, saves status and duration to MongoDB)
app.post('/api/agent/sessions/end/:sessionId', verifyUser, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sessionDoc = await Session.findOne({ sessionId });
    if (!sessionDoc) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    sessionDoc.status = 'completed';
    sessionDoc.endedAt = new Date();
    if (sessionDoc.createdAt) {
      const durSec = Math.round((sessionDoc.endedAt - sessionDoc.createdAt) / 1000);
      sessionDoc.duration = `${Math.floor(durSec / 60)}m ${durSec % 60}s`;
    }
    await sessionDoc.save();
    
    // Close mediasoup router to free worker resources
    const room = rooms[sessionId];
    if (room && room.router) {
      room.router.close();
      delete rooms[sessionId];
    }

    // Broadcast call end to other sockets in this room
    io.to(sessionId).emit('call-ended');
    
    return res.json({ success: true, status: 'completed', duration: sessionDoc.duration });
  } catch (err) {
    console.error('Failed to end session:', err);
    return res.status(500).json({ error: 'Failed to end session' });
  }
});

// Endpoint to validate a session ID for a joining customer (MongoDB)
app.get('/api/sessions/validate/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sessionDoc = await Session.findOne({ sessionId });
    if (!sessionDoc) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    return res.json(sessionDoc);
  } catch (err) {
    console.error('Failed to validate session in DB:', err);
    return res.status(500).json({ error: 'Failed to validate session' });
  }
});

// GET detailed session record (Agent-only, returns Session, Participants timeline, and Chat messages)
app.get('/api/agent/sessions/details/:sessionId', verifyUser, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const participants = await Participant.find({ sessionId }).sort({ joinedAt: 1 });
    const messages = await Message.find({ sessionId }).sort({ timestamp: 1 });
    let note = await Note.findOne({ sessionId });
    if (!note) {
      note = {
        sessionId,
        issueDescription: '',
        rootCause: '',
        resolution: '',
        followUp: ''
      };
    }
    return res.json({ session, participants, messages, note });
  } catch (err) {
    console.error('Failed to get session details:', err);
    return res.status(500).json({ error: 'Failed to load session details' });
  }
});

// SAVE support session notes (Agent-only)
app.post('/api/agent/sessions/notes/:sessionId', verifyUser, async (req, res) => {
  const { sessionId } = req.params;
  const { issueDescription, rootCause, resolution, followUp } = req.body;
  try {
    let note = await Note.findOne({ sessionId });
    if (!note) {
      note = new Note({ sessionId });
    }
    note.issueDescription = issueDescription || '';
    note.rootCause = rootCause || '';
    note.resolution = resolution || '';
    note.followUp = followUp || '';
    await note.save();
    return res.json({ success: true, note });
  } catch (err) {
    console.error('Failed to save agent notes:', err);
    return res.status(500).json({ error: 'Failed to save notes' });
  }
});

// GET admin system metrics and call logs
app.get('/api/admin/metrics', verifyAdmin, async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments();
    const activeSessions = await Session.countDocuments({ status: { $in: ['created', 'active'] } });
    
    // Count active participants across all rooms in memory
    let activeParticipants = 0;
    for (const room of Object.values(rooms)) {
      if (room.participants) {
        activeParticipants += Object.keys(room.participants).length;
      }
    }

    // Average duration of completed calls
    const completedSessions = await Session.find({ status: 'completed' });
    let totalSeconds = 0;
    completedSessions.forEach((s) => {
      if (s.endedAt && s.createdAt) {
        totalSeconds += Math.round((s.endedAt - s.createdAt) / 1000);
      }
    });
    
    const avgSec = completedSessions.length > 0 ? Math.round(totalSeconds / completedSessions.length) : 0;
    const avgDuration = `${Math.floor(avgSec / 60)}m ${avgSec % 60}s`;

    const sessionLogs = await Session.find().sort({ createdAt: -1 });

    return res.json({
      metrics: {
        totalSessions,
        activeSessions,
        activeParticipants,
        avgDuration
      },
      sessionLogs
    });
  } catch (err) {
    console.error('Failed to load admin metrics:', err);
    return res.status(500).json({ error: 'Failed to load metrics' });
  }
});

// Socket.IO signaling server
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join Room
  socket.on('join-room', async ({ sessionId, name, role }, callback) => {
    console.log(`[DEBUG SERVER] join-room received from socket=${socket.id} for sessionId=${sessionId} role=${role} name=${name}`);
    console.log(`User ${name} joining room ${sessionId} as ${role}`);
    
    let room = rooms[sessionId];
    if (!room) {
      // Recreate router in memory if session is active in MongoDB but absent in memory (e.g. server restart)
      try {
        const sessionDoc = await Session.findOne({ sessionId });
        if (sessionDoc && sessionDoc.status !== 'completed') {
          const router = await createRouter();
          rooms[sessionId] = {
            router,
            participants: {},
          };
          room = rooms[sessionId];
        } else {
          return callback({ error: 'Session has ended or does not exist.' });
        }
      } catch (err) {
        console.error('Failed to reconstruct router on join:', err);
        return callback({ error: 'Room router failed to create' });
      }
    }

    if (!room.participants) {
      room.participants = {};
    }

    // Check if there is a disconnected participant with same name & role
    const existingDisconnected = Object.entries(room.participants).find(
      ([_, p]) => p.name === name && p.role === role && p.isDisconnected
    );

    if (existingDisconnected) {
      const [oldSocketId, participant] = existingDisconnected;
      console.log(`[DEBUG SERVER] join-room restoring participant socket=${socket.id} oldSocketId=${oldSocketId}`);
      console.log(`Restoring disconnected participant: ${name}`);
      clearTimeout(participant.disconnectTimer);
      
      // Move participant to new socket.id
      room.participants[socket.id] = participant;
      room.participants[socket.id].id = socket.id;
      room.participants[socket.id].isDisconnected = false;
      delete room.participants[oldSocketId];

      socket.participantDbId = participant.participantDbId;
      socket.sessionId = sessionId;
      socket.role = role;
      socket.name = name;

      socket.join(sessionId);

      // Notify other peers in the room about reconnection
      socket.to(sessionId).emit('peer-reconnected', { socketId: socket.id, oldSocketId, name, role });

      const peers = Object.values(room.participants)
        .filter((p) => p.id !== socket.id)
        .map((p) => ({ socketId: p.id, name: p.name, role: p.role, producers: Object.keys(p.producers) }));

      console.log(`[DEBUG SERVER] join-room callback completed (restored) for socket=${socket.id}`);
      return callback({
        routerRtpCapabilities: room.router.rtpCapabilities,
        peers,
        isRestored: true
      });
    }

    // Store participant details in memory
    room.participants[socket.id] = {
      id: socket.id,
      name,
      role,
      transports: {},
      producers: {},
      consumers: {},
    };

    // Update Session status to 'active' on first join, if still 'created'
    try {
      const sessionDoc = await Session.findOne({ sessionId });
      if (sessionDoc) {
        if (sessionDoc.status === 'created') {
          sessionDoc.status = 'active';
          sessionDoc.startedAt = new Date();
          await sessionDoc.save();
        }
        
        // Save participant details to MongoDB Atlas
        const participantDoc = new Participant({
          sessionId,
          role,
          name,
          joinedAt: new Date(),
        });
        await participantDoc.save();
        
        // Save database references to the active socket object for cleanup
        socket.participantDbId = participantDoc._id;
        socket.sessionId = sessionId;
        socket.role = role;
        socket.name = name;
      }
    } catch (dbErr) {
      console.error('Failed to log participant join in MongoDB:', dbErr);
    }

    socket.join(sessionId);

    // Notify other peers in the room
    socket.to(sessionId).emit('peer-joined', { socketId: socket.id, name, role });

    // Return the current list of other participants to the joining client
    const peers = Object.values(room.participants)
      .filter((p) => p.id !== socket.id)
      .map((p) => ({ socketId: p.id, name: p.name, role: p.role, producers: Object.keys(p.producers) }));

    console.log(`[DEBUG SERVER] join-room callback completed for socket=${socket.id}`);
    callback({
      routerRtpCapabilities: room.router.rtpCapabilities,
      peers,
    });
  });

  // Get Router RTP Capabilities (for clients creating their device)
  socket.on('getRouterRtpCapabilities', ({ sessionId }, callback) => {
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });
    callback({ rtpCapabilities: room.router.rtpCapabilities });
  });

  // Create WebRTC Transport
  socket.on('createWebRtcTransport', async ({ sessionId, direction }, callback) => {
    console.log(`[DEBUG SERVER] createWebRtcTransport received from socket=${socket.id} direction=${direction} sessionId=${sessionId}`);
    console.log(`Creating WebRTC transport for socket ${socket.id} in direction ${direction}`);
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });

    try {
      const { transport, params } = await createWebRtcTransport(room.router);
      
      const participant = room.participants[socket.id];
      if (participant) {
        participant.transports[transport.id] = transport;
      }

      console.log(`[DEBUG SERVER] createWebRtcTransport success for socket=${socket.id} transportId=${transport.id}`);
      callback({ params });
    } catch (err) {
      console.error('Failed to create WebRTC transport:', err);
      callback({ error: err.message });
    }
  });

  // Connect WebRTC Transport
  socket.on('connectWebRtcTransport', async ({ sessionId, transportId, dtlsParameters }, callback) => {
    console.log(`Connecting transport ${transportId} for socket ${socket.id}`);
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });

    const participant = room.participants[socket.id];
    if (!participant) return callback({ error: 'Participant not found' });

    const transport = participant.transports[transportId];
    if (!transport) return callback({ error: 'Transport not found' });

    try {
      await transport.connect({ dtlsParameters });
      callback({});
    } catch (err) {
      console.error('Failed to connect transport:', err);
      callback({ error: err.message });
    }
  });

  // Produce Media
  socket.on('produce', async ({ sessionId, transportId, kind, rtpParameters }, callback) => {
    console.log(`[DEBUG SERVER] produce received from socket=${socket.id} kind=${kind} transportId=${transportId} sessionId=${sessionId}`);
    console.log(`Produce media (${kind}) request from socket ${socket.id}`);
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });

    const participant = room.participants[socket.id];
    if (!participant) return callback({ error: 'Participant not found' });

    const transport = participant.transports[transportId];
    if (!transport) return callback({ error: 'Transport not found' });

    try {
      const producer = await transport.produce({ kind, rtpParameters });
      
      participant.producers[producer.id] = producer;

      // Notify other peers in the room about this new producer
      console.log(`[DEBUG SERVER] new-producer emit to room=${sessionId} for socket=${socket.id} producerId=${producer.id} kind=${producer.kind}`);
      socket.to(sessionId).emit('new-producer', {
        socketId: socket.id,
        producerId: producer.id,
        kind: producer.kind,
      });

      // Handle producer close
      producer.on('transportclose', () => {
        console.log(`Producer ${producer.id} transport closed`);
        producer.close();
        delete participant.producers[producer.id];
      });

      console.log(`[DEBUG SERVER] produce success for socket=${socket.id} producerId=${producer.id}`);
      callback({ id: producer.id });
    } catch (err) {
      console.error('Failed to produce media:', err);
      callback({ error: err.message });
    }
  });

  // Consume Media
  socket.on('consume', async ({ sessionId, transportId, producerId, rtpCapabilities }, callback) => {
    console.log(`[DEBUG SERVER] consume received from socket=${socket.id} producerId=${producerId} transportId=${transportId} sessionId=${sessionId}`);
    console.log(`Consume media request for producer ${producerId} from socket ${socket.id}`);
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });

    const participant = room.participants[socket.id];
    if (!participant) return callback({ error: 'Participant not found' });

    const transport = participant.transports[transportId];
    if (!transport) return callback({ error: 'Transport not found' });

    // Find the producer in the entire room
    let targetProducer = null;
    for (const p of Object.values(room.participants)) {
      if (p.producers[producerId]) {
        targetProducer = p.producers[producerId];
        break;
      }
    }

    if (!targetProducer) {
      return callback({ error: 'Producer not found' });
    }

    try {
      // Check if we can consume this media
      if (!room.router.canConsume({ producerId: targetProducer.id, rtpCapabilities })) {
        return callback({ error: 'Cannot consume media with client capabilities' });
      }

      const consumer = await transport.consume({
        producerId: targetProducer.id,
        rtpCapabilities,
        paused: true, // Start paused to allow signaling completion
      });

      participant.consumers[consumer.id] = consumer;

      consumer.on('transportclose', () => {
        console.log(`Consumer ${consumer.id} transport closed`);
        consumer.close();
        delete participant.consumers[consumer.id];
      });

      consumer.on('producerclose', () => {
        console.log(`Producer closed. Closing consumer ${consumer.id}`);
        socket.emit('producer-closed', { producerId });
        consumer.close();
        delete participant.consumers[consumer.id];
      });

      console.log(`[DEBUG SERVER] consumer created success for socket=${socket.id} consumerId=${consumer.id} producerId=${producerId}`);
      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err) {
      console.error('Failed to consume media:', err);
      callback({ error: err.message });
    }
  });

  // Resume Consumer
  socket.on('resumeConsumer', async ({ sessionId, consumerId }, callback) => {
    console.log(`[DEBUG SERVER] resumeConsumer received from socket=${socket.id} consumerId=${consumerId} sessionId=${sessionId}`);
    console.log(`Resume consumer request: ${consumerId}`);
    const room = rooms[sessionId];
    if (!room) return callback({ error: 'Session not found' });

    const participant = room.participants[socket.id];
    if (!participant) return callback({ error: 'Participant not found' });

    const consumer = participant.consumers[consumerId];
    if (!consumer) return callback({ error: 'Consumer not found' });

    try {
      await consumer.resume();
      console.log(`[DEBUG SERVER] resumeConsumer success for socket=${socket.id} consumerId=${consumerId}`);
      callback({});
    } catch (err) {
      console.error('Failed to resume consumer:', err);
      callback({ error: err.message });
    }
  });

  // Handle Chat Message (persists to MongoDB)
  socket.on('send-message', async (data) => {
    console.log(`Chat message in room ${data.sessionId}: ${data.message} from ${data.sender}`);
    
    try {
      const newMessage = new Message({
        sessionId: data.sessionId,
        sender: data.sender,
        message: data.message,
        timestamp: new Date(data.timestamp),
      });
      await newMessage.save();
    } catch (err) {
      console.error('Failed to save message to MongoDB:', err);
    }
    
    socket.to(data.sessionId).emit('new-message', data);
  });

  // Handle explicit leave-call
  socket.on('leave-call', () => {
    console.log(`[DEBUG SERVER] leave-call received from socket=${socket.id}`);
    console.log(`User left call explicitly: ${socket.id}`);
    
    // Log participant leave time in MongoDB
    if (socket.participantDbId) {
      Participant.findByIdAndUpdate(socket.participantDbId, { leftAt: new Date() })
        .catch(err => console.error('Failed to log participant exit in MongoDB:', err));
    }

    // Clean up from rooms
    for (const [sessionId, room] of Object.entries(rooms)) {
      if (room.participants && room.participants[socket.id]) {
        const participant = room.participants[socket.id];
        
        // Clear any disconnect timers
        if (participant.disconnectTimer) {
          clearTimeout(participant.disconnectTimer);
        }

        // Clean up transports, producers, and consumers
        for (const producer of Object.values(participant.producers)) {
          producer.close();
        }
        for (const consumer of Object.values(participant.consumers)) {
          consumer.close();
        }
        for (const transport of Object.values(participant.transports)) {
          transport.close();
        }

        delete room.participants[socket.id];
        
        // Broadcast immediate leave
        console.log(`[DEBUG SERVER] peer-left emit to room=${sessionId} for socket=${socket.id} name=${participant.name}`);
        io.to(sessionId).emit('peer-left', { socketId: socket.id, name: participant.name });
        
        break;
      }
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', async () => {
    console.log(`[DEBUG SERVER] disconnect received from socket=${socket.id}`);
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Log participant leave time in MongoDB
    if (socket.participantDbId) {
      try {
        await Participant.findByIdAndUpdate(socket.participantDbId, { leftAt: new Date() });
      } catch (err) {
        console.error('Failed to log participant exit in MongoDB:', err);
      }
    }

    // Scan all rooms to find the participant
    for (const [sessionId, room] of Object.entries(rooms)) {
      if (room.participants && room.participants[socket.id]) {
        const participant = room.participants[socket.id];
        
        console.log(`Holding participant ${participant.name} from room ${sessionId} for 30 seconds reconnect window...`);
        participant.isDisconnected = true;
        
        // Broadcast that the participant is temporarily disconnected
        socket.to(sessionId).emit('peer-disconnected', { socketId: socket.id, name: participant.name });

        participant.disconnectTimer = setTimeout(() => {
          console.log(`Cleaning up participant ${participant.name} from room ${sessionId} after 30s timeout`);
          
          // Clean up transports, producers, and consumers
          for (const producer of Object.values(participant.producers)) {
            producer.close();
          }
          for (const consumer of Object.values(participant.consumers)) {
            consumer.close();
          }
          for (const transport of Object.values(participant.transports)) {
            transport.close();
          }

          delete room.participants[socket.id];
          io.to(sessionId).emit('peer-left', { socketId: socket.id, name: participant.name });
        }, 30000);
        
        break;
      }
    }
  });
});

// Connect database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});
