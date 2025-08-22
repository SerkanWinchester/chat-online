const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve os arquivos da pasta 'public'
app.use(express.static('public'));

let users = {};

io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.username = username;
        users[socket.id] = username;
        io.emit('updateUsers', Object.values(users));
        socket.broadcast.emit('message', { user: 'Sistema', text: `${username} entrou.` });
    });

    socket.on('sendMessage', (data) => {
        io.emit('message', { user: data.user, text: data.text });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            const username = socket.username;
            delete users[socket.id];
            io.emit('updateUsers', Object.values(users));
            io.emit('message', { user: 'Sistema', text: `${username} saiu.` });
        }
    });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
