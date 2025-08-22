// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// ATUALIZAÇÃO IMPORTANTE: Configuração do CORS
// Isso permite que o seu blog se conecte ao servidor do Render
const io = socketIo(server, {
    cors: {
        origin: "*", // Permite conexão de qualquer site
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// O servidor agora serve o script do widget e o CSS
app.use(express.static(path.join(__dirname)));

// Lógica do chat (permanece a mesma)
let users = {};

io.on('connection', (socket) => {
    console.log(`Novo usuário conectado: ${socket.id}`);

    socket.on('user_joined', (username) => {
        socket.username = username;
        users[username] = socket.id;
        io.emit('system_message', `${username} entrou no chat.`);
        io.emit('update_user_list', Object.keys(users));
    });

    socket.on('send_message', (data) => { io.emit('message_received', data); });
    socket.on('send_private_message', (data) => {
        const recipientSocketId = users[data.to];
        if (recipientSocketId) { io.to(recipientSocketId).emit('private_message_received', data); }
        socket.emit('private_message_received', data);
    });
    socket.on('send_reaction', (data) => { io.emit('reaction_received', data); });
    socket.on('send_nudge', (data) => {
        const recipientSocketId = users[data.to];
        if (recipientSocketId) { io.to(recipientSocketId).emit('nudge_received', { from: data.from }); }
    });
    socket.on('disconnect', () => {
        if (socket.username) {
            delete users[socket.username];
            io.emit('system_message', `${socket.username} saiu do chat.`);
            io.emit('update_user_list', Object.keys(users));
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
