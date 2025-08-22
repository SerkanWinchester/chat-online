// server.js

// 1. Configuração do Servidor
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Informa ao servidor que os arquivos estáticos (HTML, CSS, JS do cliente) estão na pasta 'public'
app.use(express.static('public'));

let users = {}; // Armazena os usuários conectados: { "username": "socket.id" }

// 2. Lógica do Chat em Tempo Real com Socket.IO
io.on('connection', (socket) => {
    console.log(`Novo usuário conectado: ${socket.id}`);

    // Quando um usuário entra no chat
    socket.on('user_joined', (username) => {
        socket.username = username;
        users[username] = socket.id;
        // Avisa a todos que um novo usuário entrou
        io.emit('system_message', `${username} entrou no chat.`);
        // Atualiza a lista de usuários para todos
        io.emit('update_user_list', Object.keys(users));
    });

    // Quando uma mensagem geral é enviada
    socket.on('send_message', (data) => {
        // Envia a mensagem para todos os usuários conectados
        io.emit('message_received', data);
    });
    
    // Quando uma mensagem privada é enviada
    socket.on('send_private_message', (data) => {
        const recipientSocketId = users[data.to];
        if (recipientSocketId) {
            // Envia para o destinatário
            io.to(recipientSocketId).emit('private_message_received', data);
        }
        // Envia de volta para o remetente também, para que ele veja sua própria mensagem
        socket.emit('private_message_received', data);
    });

    // Quando uma reação é enviada
    socket.on('send_reaction', (data) => {
        io.emit('reaction_received', data);
    });
    
    // Quando um puxão é enviado
    socket.on('send_nudge', (data) => {
        const recipientSocketId = users[data.to];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('nudge_received', { from: data.from });
        }
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        if (socket.username) {
            console.log(`Usuário desconectado: ${socket.username}`);
            delete users[socket.username];
            // Avisa a todos que o usuário saiu
            io.emit('system_message', `${socket.username} saiu do chat.`);
            // Atualiza a lista de usuários para todos
            io.emit('update_user_list', Object.keys(users));
        }
    });
});


// 3. Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
