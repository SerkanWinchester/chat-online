const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve os arquivos da pasta 'public'
app.use(express.static('public'));

let users = {};

// Lógica do chat em tempo real
io.on('connection', (socket) => {
    // Quando um usuário entra
    socket.on('join', (username) => {
        socket.username = username;
        users[username] = socket.id;
        io.emit('updateUsers', Object.keys(users));
        socket.broadcast.emit('message', { user: 'Sistema', text: `${username} entrou no chat.` });
    });

    // Quando uma mensagem é enviada
    socket.on('sendMessage', (data) => {
        io.emit('message', { user: data.user, text: data.text });
    });

    // Quando um usuário se desconecta
    socket.on('disconnect', () => {
        if (socket.username) {
            delete users[socket.username];
            io.emit('updateUsers', Object.keys(users));
            io.emit('message', { user: 'Sistema', text: `${socket.username} saiu do chat.` });
        }
    });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
