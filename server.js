const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 10000;

let users = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Novo usuário conectado: ' + socket.id);

  socket.on('login', ({ username }) => {
    users[socket.id] = { name: username, status: 'online' };
    io.emit('user list update', users);
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('user status update', ({ status }) => {
    if (users[socket.id]) users[socket.id].status = status;
    io.emit('user list update', users);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('user list update', users);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
