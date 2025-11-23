const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: process.env.CORS_ORIGIN || '*', 
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pingnow-secret-key-2024';

// File upload setup
const uploadDir = 'uploads';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Data storage
const DATA_FILE = './data.json';
let data = { users: [], chats: [], messages: [], groups: [], callHistory: [] };

// Load data
try {
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
} catch (error) {
  console.log('No existing data file, starting fresh');
}

const saveData = () => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Online users tracking
const onlineUsers = new Map();

// Auth Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;
    
    if (!name || !email || !password || !age) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (age < 18) {
      return res.status(400).json({ error: 'Must be 18 or older' });
    }
    
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const username = `user_${name.toLowerCase().replace(/\s/g, '')}_${Math.random().toString(36).substr(2, 4)}`;
    
    const genderType = gender || 'other';
    let avatarUrl;
    if (genderType === 'male') {
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&gender=male`;
    } else if (genderType === 'female') {
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}&gender=female`;
    } else {
      avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
    }
    
    const user = {
      userId,
      name,
      email,
      password: hashedPassword,
      age,
      gender: genderType,
      username,
      avatar: avatarUrl,
      status: 'offline',
      createdAt: new Date().toISOString()
    };
    
    data.users.push(user);
    saveData();
    
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = data.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', (req, res) => {
  const users = data.users.map(u => ({
    ...u,
    password: undefined,
    status: onlineUsers.has(u.userId) ? 'online' : 'offline'
  }));
  res.json(users);
});

app.get('/api/user/:userId', (req, res) => {
  const user = data.users.find(u => u.userId === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, password: undefined });
});

app.get('/api/call-history/:userId', (req, res) => {
  const userHistory = data.callHistory
    .filter(c => c.fromUserId === req.params.userId || c.toUserId === req.params.userId)
    .map(call => {
      const isOutgoing = call.fromUserId === req.params.userId;
      const otherUserId = isOutgoing ? call.toUserId : call.fromUserId;
      const otherUser = data.users.find(u => u.userId === otherUserId);
      
      return {
        id: call.id,
        userId: otherUserId,
        userName: otherUser?.name || 'Unknown',
        userAvatar: otherUser?.avatar || '',
        type: call.type,
        direction: isOutgoing ? 'outgoing' : 'incoming',
        status: call.status,
        duration: call.duration,
        timestamp: call.timestamp
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(userHistory);
});

// Chat Routes
app.get('/api/chats/:userId', (req, res) => {
  const userChats = data.chats.filter(c => c.participants.includes(req.params.userId));
  res.json(userChats);
});

app.get('/api/messages/:chatId', (req, res) => {
  const messages = data.messages.filter(m => m.chatId === req.params.chatId);
  res.json(messages);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('register', (userId) => {
    console.log('User registered:', userId, 'Socket ID:', socket.id);
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    io.emit('userOnline', { userId });
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    
    const userGroups = data.groups.filter(g => g.members.includes(userId));
    socket.emit('groups', userGroups);
  });
  
  socket.on('sendMessage', (messageData) => {
    const message = {
      id: uuidv4(),
      ...messageData,
      timestamp: new Date().toISOString(),
      status: 'sent',
      read: false
    };
    
    data.messages.push(message);
    saveData();
    
    const recipientSocketId = onlineUsers.get(messageData.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', message);
      message.status = 'delivered';
      saveData();
      socket.emit('messageStatusUpdate', { messageId: message.id, status: 'delivered' });
    }
    socket.emit('messageSent', message);
  });

  socket.on('messageRead', ({ messageId, userId }) => {
    const msg = data.messages.find(m => m.id === messageId);
    if (msg) {
      msg.read = true;
      msg.status = 'read';
      saveData();
      const senderSocketId = onlineUsers.get(msg.from);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageStatusUpdate', { messageId, status: 'read' });
      }
    }
  });
  
  socket.on('typing', ({ to, isTyping }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', { userId: socket.userId, isTyping });
    }
  });
  
  socket.on('deleteMessage', ({ messageId, deleteFor }) => {
    const msgIndex = data.messages.findIndex(m => m.id === messageId);
    if (msgIndex !== -1) {
      if (deleteFor === 'everyone') {
        data.messages.splice(msgIndex, 1);
        saveData();
        io.emit('messageDeleted', { messageId });
      } else {
        socket.emit('messageDeleted', { messageId });
      }
    }
  });
  
  socket.on('editMessage', ({ messageId, text }) => {
    const msg = data.messages.find(m => m.id === messageId);
    if (msg) {
      msg.text = text;
      msg.edited = true;
      saveData();
      io.emit('messageEdited', { messageId, text });
    }
  });
  
  socket.on('call-ringing', (data) => {
    console.log('Call ringing from', data.from, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    console.log('Recipient socket ID:', recipientSocketId);
    console.log('Online users:', Array.from(onlineUsers.keys()));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-ringing', { ...data, from: socket.userId });
      console.log('Call ringing event sent to recipient');
    } else {
      console.log('Recipient not online');
      socket.emit('call-failed', { error: 'User not online' });
    }
  });
  
  socket.on('call-accepted', (data) => {
    console.log('Call accepted from', data.from, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-accepted', { ...data, from: socket.userId });
      console.log('Call accepted event sent');
    }
  });
  

  
  socket.on('call-answer', (data) => {
    console.log('Call answer from', socket.userId, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-answer', { ...data, from: socket.userId });
      console.log('Call answer sent');
    }
  });
  
  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate from', socket.userId, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('ice-candidate', { ...data, from: socket.userId });
    }
  });
  
  socket.on('call-ended', (data) => {
    console.log('Call ended from', socket.userId, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-ended', { ...data, from: socket.userId });
    }
    
    // Save call history
    const callRecord = {
      id: `CALL${Date.now()}`,
      fromUserId: socket.userId,
      toUserId: data.to,
      type: data.type || 'audio',
      status: data.status || 'completed',
      duration: data.duration || 0,
      timestamp: new Date().toISOString()
    };
    data.callHistory.push(callRecord);
    saveData();
  });
  
  socket.on('call-rejected', (data) => {
    console.log('Call rejected from', data.from, 'to', data.to);
    const recipientSocketId = onlineUsers.get(data.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-rejected', { ...data, from: socket.userId });
    }
    
    // Save rejected call
    const callRecord = {
      id: `CALL${Date.now()}`,
      fromUserId: data.from,
      toUserId: data.to,
      type: data.type || 'audio',
      status: 'rejected',
      duration: 0,
      timestamp: new Date().toISOString()
    };
    data.callHistory.push(callRecord);
    saveData();
  });
  
  socket.on('create-group', ({ name, members, admin }) => {
    const group = {
      id: `GRP${Date.now()}`,
      name,
      members: [...members, admin],
      admins: [admin],
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${Date.now()}`,
      wallpaper: null,
      createdAt: new Date().toISOString()
    };
    
    data.groups.push(group);
    saveData();
    
    group.members.forEach(memberId => {
      const socketId = onlineUsers.get(memberId);
      if (socketId) {
        io.to(socketId).emit('group-created', { group });
      }
    });
  });
  
  socket.on('group-update', ({ groupId, updates }) => {
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
      Object.assign(group, updates);
      saveData();
      
      group.members.forEach(memberId => {
        const socketId = onlineUsers.get(memberId);
        if (socketId) {
          io.to(socketId).emit('group-updated', { group });
        }
      });
    }
  });
  
  socket.on('group-kick', ({ groupId, memberId }) => {
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
      group.members = group.members.filter(m => m !== memberId);
      saveData();
      
      const kickedSocketId = onlineUsers.get(memberId);
      if (kickedSocketId) {
        io.to(kickedSocketId).emit('group-removed', { groupId });
      }
      
      group.members.forEach(m => {
        const socketId = onlineUsers.get(m);
        if (socketId) {
          io.to(socketId).emit('group-updated', { group });
        }
      });
    }
  });
  
  socket.on('group-leave', ({ groupId }) => {
    const group = data.groups.find(g => g.id === groupId);
    if (group) {
      group.members = group.members.filter(m => m !== socket.userId);
      group.admins = group.admins.filter(a => a !== socket.userId);
      
      if (group.members.length === 0) {
        data.groups = data.groups.filter(g => g.id !== groupId);
      } else if (group.admins.length === 0) {
        group.admins.push(group.members[0]);
      }
      
      saveData();
      
      group.members.forEach(m => {
        const socketId = onlineUsers.get(m);
        if (socketId) {
          io.to(socketId).emit('group-updated', { group });
        }
      });
    }
  });
  
  socket.on('load-group-messages', ({ groupId }) => {
    const messages = data.messages.filter(m => m.chatId === groupId);
    socket.emit('groupMessages', { groupId, messages });
  });
  
  socket.on('block-user', ({ userId, blockUserId }) => {
    const user = data.users.find(u => u.userId === userId);
    if (user) {
      if (!user.blockedUsers) user.blockedUsers = [];
      if (!user.blockedUsers.includes(blockUserId)) {
        user.blockedUsers.push(blockUserId);
        saveData();
      }
    }
  });
  
  socket.on('delete-chat', ({ chatId, userId }) => {
    data.messages = data.messages.filter(m => m.chatId !== chatId);
    saveData();
  });
  
  socket.on('onetap-viewed', ({ messageId }) => {
    const msg = data.messages.find(m => m.id === messageId);
    if (msg) {
      msg.viewed = true;
      saveData();
    }
  });
  
  socket.on('group-message', (messageData) => {
    const message = {
      id: uuidv4(),
      ...messageData,
      chatId: messageData.groupId,
      from: messageData.senderId,
      timestamp: new Date().toISOString()
    };
    
    data.messages.push(message);
    saveData();
    
    const group = data.groups.find(g => g.id === messageData.groupId);
    if (group) {
      group.members.forEach(memberId => {
        const socketId = onlineUsers.get(memberId);
        if (socketId) {
          io.to(socketId).emit('newMessage', message);
        }
      });
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('userOffline', { userId: socket.userId });
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
