const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Define a porta do servidor
const PORT = process.env.PORT || 3000;

// Armazena a lista de usuários online
const users = {};

// Serve os arquivos estáticos da pasta raiz
app.use(express.static(path.join(__dirname)));

// Quando um cliente se conectar
io.on('connection', (socket) => {
  console.log('Novo usuário conectado');
  
  // O cliente envia seu nome e cor para ser adicionado à lista
  socket.on('user connected', (user) => {
    users[socket.id] = user;
    io.emit('user list update', Object.values(users));
  });

  // Quando o servidor recebe uma mensagem do chat, ele retransmite para todos
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // Quando um cliente desconecta
  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
    delete users[socket.id];
    io.emit('user list update', Object.values(users));
  });
});

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
