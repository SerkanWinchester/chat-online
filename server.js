const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Define a porta do servidor
const PORT = process.env.PORT || 3000;

// Serve os arquivos estáticos da pasta onde está o index.html
app.use(express.static(path.join(__dirname)));

// Quando um cliente se conectar, ele vai receber uma mensagem
io.on('connection', (socket) => {
  console.log('Novo usuário conectado');
  
  // Quando o servidor recebe uma mensagem do chat, ele retransmite para todos
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // Quando um cliente desconecta
  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
  });
});

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});