const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let users = {}; // Armazena { "socket.id": "username" }

io.on('connection', (socket) => {
    // Quando um usuário faz login
    socket.on('user_login', (username) => {
        socket.username = username;
        users[socket.id] = username;
        // Envia a lista atualizada de usuários para todos
        io.emit('update_user_list', Object.values(users));
        // Avisa a todos que um novo usuário entrou
        socket.broadcast.emit('system_message', `${username} entrou no chat.`);
    });

    // Quando uma mensagem geral é enviada
    socket.on('send_general_message', (data) => {
        // Envia a mensagem para todos, incluindo o remetente
        io.emit('receive_general_message', data);
    });

    // Quando uma mensagem privada é enviada
    socket.on('send_private_message', (data) => {
        const recipientSocketId = Object.keys(users).find(key => users[key] === data.to);
        if (recipientSocketId) {
            // Envia para o destinatário
            io.to(recipientSocketId).emit('receive_private_message', data);
        }
        // Envia de volta para o remetente
        socket.emit('receive_private_message', data);
    });

    // Quando um puxão é enviado
    socket.on('send_nudge', (data) => {
        const recipientSocketId = Object.keys(users).find(key => users[key] === data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('nudge_received', { from: data.from });
        }
    });

    // Quando um usuário está digitando
    socket.on('user_typing', (username) => {
        socket.broadcast.emit('show_typing_indicator', username);
    });
    socket.on('user_stopped_typing', () => {
        socket.broadcast.emit('hide_typing_indicator');
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            delete users[socket.id];
            io.emit('update_user_list', Object.values(users));
            io.emit('system_message', `${username} saiu do chat.`);
        }
    });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
