const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Lista de usuários online
let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Quando um usuário entra, adicionamos ele à lista e avisamos a todos
  socket.on('user joined', (username) => {
    onlineUsers[socket.id] = username;
    io.emit('online users list', Object.values(onlineUsers));
    io.emit('system message', `${username} has joined the room.`);
  });

  // Quando uma mensagem é recebida, re-enviamos para todos os clientes
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // Quando um usuário se desconecta, removemos ele da lista e avisamos a todos
  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    console.log('A user disconnected:', username);
    delete onlineUsers[socket.id];
    io.emit('online users list', Object.values(onlineUsers));
    io.emit('system message', `${username} has left the room.`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
