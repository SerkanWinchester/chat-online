const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const users = {};
const roomLocks = { 1: false, 2: false };

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('login', (data) => {
    socket.username = data.username;
    socket.room = data.room;
    users[socket.username] = socket.room;
    socket.join(socket.room);
    io.emit('update users', users);
    socket.to(socket.room).emit('system message', `${socket.username} entered the room.`);
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      delete users[socket.username];
      io.emit('update users', users);
      socket.to(socket.room).emit('system message', `${socket.username} left the room.`);
    }
    console.log('User disconnected:', socket.id);
  });

  socket.on('logout', (username) => {
    if (users[username]) {
      delete users[username];
      io.emit('update users', users);
    }
  });

  socket.on('chat message', (msg) => {
    io.to(socket.room).emit('chat message', msg);
  });

  socket.on('change room', (data) => {
    const { oldRoom, newRoom, username } = data;
    if (roomLocks[newRoom] && !username.includes('(Admin)')) {
      socket.emit('system message', `Room ${newRoom} is locked. You cannot enter.`);
      return;
    }
    socket.leave(oldRoom);
    socket.join(newRoom);
    users[username] = newRoom;
    io.emit('update users', users);
    socket.to(oldRoom).emit('system message', `${username} left the room.`);
    socket.to(newRoom).emit('system message', `${username} entered the room.`);
    socket.emit('system message', `You have entered Room ${newRoom}.`);
  });

  socket.on('kick user', (username) => {
    const userSocket = Object.values(io.sockets.sockets).find(s => s.username === username);
    if (userSocket) {
      const room = userSocket.room;
      userSocket.leave(room);
      delete users[username];
      io.emit('update users', users);
      userSocket.emit('system message', 'You have been kicked by an admin.');
    }
  });

  socket.on('admin search user', (username) => {
    const foundUser = Object.keys(users).find(u => u.toLowerCase().startsWith(username.toLowerCase()));
    if (foundUser) {
      socket.emit('admin search result', { type: 'user', content: `User ${foundUser} is in Room ${users[foundUser]}.` });
    } else {
      socket.emit('admin search result', { type: 'user', content: `User "${username}" not found.` });
    }
  });

  socket.on('admin search room', (room) => {
    const usersInRoom = Object.entries(users)
      .filter(([user, r]) => r === room)
      .map(([user]) => user);
    if (usersInRoom.length > 0) {
      socket.emit('admin search result', { type: 'room', content: `Users in Room ${room}: ${usersInRoom.join(', ')}.` });
    } else {
      socket.emit('admin search result', { type: 'room', content: `Nobody in Room ${room}.` });
    }
  });

  socket.on('toggle room lock', (room) => {
    roomLocks[room] = !roomLocks[room];
    io.to(room).emit('room lock status', roomLocks[room]);
    io.to(room).emit('system message', `Room ${room} has been ${roomLocks[room] ? 'locked' : 'unlocked'} by an admin.`);
  });

  socket.on('global message', (data) => {
    io.emit('global message', data);
  });

  socket.on('alarm', (data) => {
    if (data.type === 'all') {
      io.to(data.room).emit('system message', 'Attention! Alarm message for everyone!');
      io.to(data.room).emit('shake window');
    } else {
      const targetSocket = Object.values(io.sockets.sockets).find(s => s.username === data.user);
      if (targetSocket) {
        targetSocket.emit('system message', `Attention! Alarm message for you!`);
        targetSocket.emit('shake window');
      }
    }
  });

  socket.on('request users online', () => {
    socket.emit('users online list', users);
  });
  
  socket.on('file upload', (data) => {
      const fileData = {
          ...data,
          username: socket.username,
          isAdmin: socket.username.includes('(Admin)'),
          timestamp: new Date().toLocaleString()
      };
      io.to(socket.room).emit('file uploaded', fileData);
  });

  // Signaling for WebRTC
  socket.on('start peer call', (data) => {
    const targetSocket = Object.values(io.sockets.sockets).find(s => s.username === data.to);
    if (targetSocket) {
        // Envia a oferta para o usuário alvo
        socket.emit('audio call offer', { to: targetSocket.id, offer: data.offer });
    }
  });

  socket.on('audio call offer', (data) => {
    // Repassa a oferta para o usuário alvo
    socket.to(data.to).emit('audio call offer', data.offer);
  });

  socket.on('audio call answer', (data) => {
    // Repassa a resposta para o usuário que fez a oferta
    socket.to(data.to).emit('audio call answer', data.answer);
  });

  socket.on('ice candidate', (data) => {
    // Repassa o candidato ICE para o usuário alvo
    socket.to(data.to).emit('ice candidate', data.candidate);
  });
  
  socket.on('end call', (data) => {
      // Notifica todos na sala que a chamada terminou
      io.to(socket.room).emit('call ended');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
