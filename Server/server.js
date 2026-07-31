/**
 * Server/server.js
 * 
 * Production-quality, educational mock SIP & WebRTC signaling server.
 * Simulates a SIP registrar and proxy server by receiving, parsing, and routing
 * SIP messages wrapped in Socket.IO packets.
 * 
 * Features:
 * - REST API for user login and retrieval.
 * - In-memory user store.
 * - Live user status broadcasting (ONLINE, OFFLINE, IN CALL).
 * - Standard SIP flow simulation (REGISTER, INVITE, TRYING, RINGING, OK, BYE, CANCEL, BUSY).
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// In-memory user store
const users = {
  alice: { username: 'alice', password: '123', status: 'OFFLINE', socketId: null, token: null },
  bob: { username: 'bob', password: '123', status: 'OFFLINE', socketId: null, token: null },
  charlie: { username: 'charlie', password: '123', status: 'OFFLINE', socketId: null, token: null },
  david: { username: 'david', password: '123', status: 'OFFLINE', socketId: null, token: null },
  emily: { username: 'emily', password: '123', status: 'OFFLINE', socketId: null, token: null },
  jack: { username: 'jack', password: '123', status: 'OFFLINE', socketId: null, token: null },
};

// Map socket.id -> username for fast reverse lookups
const socketToUser = new Map();

// Helper to log server activity in a formatted style
function logServer(module, action, detail = '') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] [Server] [${module}] ${action} ${detail ? `| ${detail}` : ''}`);
}

/**
 * REST API: Health Check (used by Client for auto-discovering server IP)
 */
app.get('/api/health', (req, res) => {
  return res.json({ success: true, status: 'ok', timestamp: Date.now() });
});

/**
 * REST API: User Login
 * Returns a mock authorization token if credentials are valid.
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const userKey = username.toLowerCase();
  const user = users[userKey];

  if (user && user.password === password) {
    // Generate simple token
    const token = `mock-jwt-token-${userKey}-${Date.now()}`;
    user.token = token;
    
    logServer('AuthAPI', 'Login Success', `User: ${username}`);
    return res.json({
      success: true,
      token,
      username: user.username,
    });
  }

  logServer('AuthAPI', 'Login Failed', `User: ${username}`);
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

/**
 * REST API: Get All Users
 * Requires authorization token.
 */
app.get('/api/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];
  // Verify token matches any in-memory user
  const validatedUser = Object.values(users).find(u => u.token === token);
  
  if (!validatedUser) {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
  }

  // Map to public user list (exclude passwords/tokens)
  const userList = Object.values(users).map(u => ({
    username: u.username,
    status: u.status,
  }));

  return res.json({ success: true, users: userList });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/**
 * Utility: Parse SIP raw message headers and body
 */
function parseSIPMessage(rawMsg) {
  if (!rawMsg || typeof rawMsg !== 'string') return null;

  const parts = rawMsg.split('\r\n\r\n');
  const headerLines = parts[0].split('\r\n');
  const firstLine = headerLines[0];
  const headers = {};

  for (let i = 1; i < headerLines.length; i++) {
    const line = headerLines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  const body = parts.slice(1).join('\r\n\r\n');

  // Extract SIP Method / Status
  let method = '';
  let statusCode = null;
  const firstLineParts = firstLine.split(' ');
  
  if (firstLine.startsWith('SIP/2.0')) {
    statusCode = parseInt(firstLineParts[1], 10);
  } else {
    method = firstLineParts[0];
  }

  // Helper to extract username from SIP headers like "To: <sip:bob@domain.com>" or "sip:bob@domain.com"
  const extractUsername = (headerVal) => {
    if (!headerVal) return null;
    const match = headerVal.match(/sip:([^@>]+)/i);
    return match ? match[1] : null;
  };

  const toUser = extractUsername(headers['to']);
  const fromUser = extractUsername(headers['from']);

  return {
    firstLine,
    method,
    statusCode,
    headers,
    body,
    toUser,
    fromUser,
    callId: headers['call-id'] || '',
    cseq: headers['cseq'] || '',
  };
}

/**
 * Utility: Broadcast user list update to all connected sockets
 */
function broadcastUserStatus() {
  const userList = Object.values(users).map(u => ({
    username: u.username,
    status: u.status,
  }));
  io.emit('user-status-update', userList);
  logServer('Presence', 'Broadcasted User States', `${userList.length} users`);
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  logServer('Socket', 'New connection request', `SocketID: ${socket.id}`);

  // Authenticate socket using token passed in handshake auth or query
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const user = Object.values(users).find(u => u.token === token);

  if (!user) {
    logServer('Socket', 'Auth Rejected', `SocketID: ${socket.id}. Disconnecting.`);
    socket.disconnect(true);
    return;
  }

  const username = user.username;
  logServer('Socket', 'Authenticated', `User: ${username}, SocketID: ${socket.id}`);
  
  // Link user details
  user.socketId = socket.id;
  socketToUser.set(socket.id, username);

  // Send initial success connection acknowledge
  socket.emit('connection-established', { username });

  // Handle incoming custom SIP message over Socket.IO
  socket.on('sip-outgoing-msg', (rawMsg) => {
    const parsed = parseSIPMessage(rawMsg);
    if (!parsed) return;

    logServer('SIP-Proxy', `Incoming Raw SIP from ${username}`, parsed.firstLine);

    // 1. Handle SIP REGISTER
    if (parsed.method === 'REGISTER') {
      const isUnregister = parsed.headers['expires'] === '0';
      user.status = isUnregister ? 'OFFLINE' : 'ONLINE';
      
      logServer('SIP-Registrar', isUnregister ? 'UNREGISTER' : 'REGISTER', `User: ${username}`);
      
      // Reply 200 OK to the sender
      const via = parsed.headers['via'] || 'SIP/2.0/WS client.invalid;branch=z9hG4bK';
      const to = parsed.headers['to'] || `<sip:${username}@mock.sip.server>`;
      const from = parsed.headers['from'] || `<sip:${username}@mock.sip.server>`;
      const contact = parsed.headers['contact'] || `<sip:${username}@mock.sip.server;transport=ws>`;
      const callId = parsed.callId;
      const cseq = parsed.cseq;

      const okResponse = 
        `SIP/2.0 200 OK\r\n` +
        `Via: ${via}\r\n` +
        `To: ${to};tag=mock-server-tag-${Date.now()}\r\n` +
        `From: ${from}\r\n` +
        `Call-ID: ${callId}\r\n` +
        `CSeq: ${cseq}\r\n` +
        `Contact: ${contact}\r\n` +
        `Expires: ${isUnregister ? '0' : '600'}\r\n` +
        `Content-Length: 0\r\n\r\n`;

      socket.emit('sip-incoming-msg', okResponse);
      broadcastUserStatus();
      return;
    }

    // 2. Handle INVITE
    if (parsed.method === 'INVITE') {
      const calleeName = parsed.toUser;
      const callee = calleeName ? users[calleeName.toLowerCase()] : null;

      if (!callee || callee.status !== 'ONLINE') {
        // Send 486 Busy / 480 Temp Unavailable if Callee is offline or not found
        logServer('SIP-Proxy', 'INVITE Failed', `Callee: ${calleeName} is offline or unavailable`);
        
        const via = parsed.headers['via'] || 'SIP/2.0/WS client.invalid;branch=z9hG4bK';
        const to = parsed.headers['to'] || `<sip:${calleeName}@mock.sip.server>`;
        const from = parsed.headers['from'] || `<sip:${username}@mock.sip.server>`;
        const callId = parsed.callId;
        const cseq = parsed.cseq;

        const busyResponse = 
          `SIP/2.0 486 Busy Here\r\n` +
          `Via: ${via}\r\n` +
          `To: ${to};tag=mock-server-busy\r\n` +
          `From: ${from}\r\n` +
          `Call-ID: ${callId}\r\n` +
          `CSeq: ${cseq}\r\n` +
          `Content-Length: 0\r\n\r\n`;

        socket.emit('sip-incoming-msg', busyResponse);
        return;
      }

      // Store call relationship or mark busy immediately to prevent multiple calls
      user.status = 'IN CALL';
      callee.status = 'IN CALL';
      broadcastUserStatus();

      // Send 100 Trying to Caller
      const via = parsed.headers['via'];
      const to = parsed.headers['to'];
      const from = parsed.headers['from'];
      const callId = parsed.callId;
      const cseq = parsed.cseq;

      const tryingResponse = 
        `SIP/2.0 100 Trying\r\n` +
        `Via: ${via}\r\n` +
        `To: ${to}\r\n` +
        `From: ${from}\r\n` +
        `Call-ID: ${callId}\r\n` +
        `CSeq: ${cseq}\r\n` +
        `Content-Length: 0\r\n\r\n`;

      socket.emit('sip-incoming-msg', tryingResponse);

      // Send 180 Ringing to Caller
      const ringingResponse = 
        `SIP/2.0 180 Ringing\r\n` +
        `Via: ${via}\r\n` +
        `To: ${to};tag=mock-callee-tag-${Date.now()}\r\n` +
        `From: ${from}\r\n` +
        `Call-ID: ${callId}\r\n` +
        `CSeq: ${cseq}\r\n` +
        `Contact: <sip:${calleeName}@mock.sip.server;transport=ws>\r\n` +
        `Content-Length: 0\r\n\r\n`;

      socket.emit('sip-incoming-msg', ringingResponse);

      // Forward INVITE to Callee
      const calleeSocket = io.sockets.sockets.get(callee.socketId);
      if (calleeSocket) {
        logServer('SIP-Proxy', 'Forwarding INVITE', `From ${username} to ${calleeName}`);
        calleeSocket.emit('sip-incoming-msg', rawMsg);
      }
      return;
    }

    // 3. Handle BYE, CANCEL, DECLINE (and general standard methods)
    // Forward the SIP packet directly to the destination party
    const targetUser = parsed.toUser;
    const senderUser = parsed.fromUser;
    
    // Determine where to route the packet
    // Standard SIP routing maps by To header, but for responses it routes back to From
    // Let's resolve the recipient
    let recipientName = null;

    if (parsed.statusCode) {
      // It's a response (e.g., 200 OK, 486 Busy, 180 Ringing)
      // Route to FromUser (the caller)
      recipientName = parsed.fromUser;
    } else {
      // It's a request (e.g., BYE, CANCEL, ACK)
      // Route to ToUser (the callee)
      recipientName = parsed.toUser;
    }

    if (!recipientName) {
      logServer('SIP-Proxy', 'Routing Error', 'Unable to resolve recipient');
      return;
    }

    const recipient = users[recipientName.toLowerCase()];
    
    // Handle specific session termination events to restore presence
    if (parsed.method === 'BYE' || parsed.method === 'CANCEL' || parsed.statusCode === 486 || parsed.statusCode === 603) {
      // Reset caller status
      if (senderUser && users[senderUser.toLowerCase()]) {
        users[senderUser.toLowerCase()].status = 'ONLINE';
      }
      // Reset callee status
      if (targetUser && users[targetUser.toLowerCase()]) {
        users[targetUser.toLowerCase()].status = 'ONLINE';
      }
      broadcastUserStatus();
    }

    if (recipient && recipient.socketId) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        logServer('SIP-Proxy', `Forwarding: ${parsed.method || parsed.statusCode}`, `To ${recipientName}`);
        recipientSocket.emit('sip-incoming-msg', rawMsg);
      }
    } else {
      logServer('SIP-Proxy', 'Forwarding Failed', `Recipient ${recipientName} is offline`);
    }
  });

  // Handle call hold state signaling
  socket.on('call-hold-state', ({ target, isHold }) => {
    const recipient = users[target.toLowerCase()];
    if (recipient && recipient.socketId) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        logServer('SIP-Proxy', `Forwarding Hold State: ${isHold}`, `From ${username} to ${target}`);
        recipientSocket.emit('call-hold-state', { from: username, isHold });
      }
    }
  });

  // Handle sudden socket disconnects
  socket.on('disconnect', () => {
    const userObj = users[username.toLowerCase()];
    if (userObj) {
      userObj.status = 'OFFLINE';
      userObj.socketId = null;
      userObj.token = null; // Invalidate session on disconnect
      logServer('Socket', 'Disconnected', `User: ${username}`);
      broadcastUserStatus();
    }
    socketToUser.delete(socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` MOCK SIP / WEBRTC SIGNALING SERVER IS RUNNING`);
  console.log(` Listening on all interfaces (0.0.0.0:${PORT})`);
  console.log(` REST APIs: http://localhost:${PORT}/api/auth/login`);
  console.log(` Socket.IO Endpoint: ws://localhost:${PORT}`);
  console.log(`====================================================`);
});
