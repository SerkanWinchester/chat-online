// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que qualquer blog se conecte ao seu chat
        methods: ["GET", "POST"]
    }
});

// Variáveis de estado do servidor reais
const users = {};
const roomLocks = { 1: false, 2: false };
const adminPasswords = { 'serkan': '51995429192', 'elieser': '51995429192' };

// Use CORS para permitir conexões de outros domínios
app.use(cors());

// Configura o Express para servir arquivos estáticos (se necessário)
// Por exemplo, o seu arquivo HTML principal
app.use(express.static(path.join(__dirname, 'public')));

// A rota principal pode retornar um simples status
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Lógica do Socket.IO
io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Quando o cliente se logar
    socket.on('login', (username) => {
        // Validação e lógica do admin no servidor
        if (users[username]) {
            socket.emit('login_error', 'Username already taken.');
            return;
        }

        const isAdmin = adminPasswords.hasOwnProperty(username.toLowerCase());
        users[username] = { id: socket.id, room: 0, isAdmin: isAdmin };
        socket.join(0);
        socket.username = username;

        socket.emit('login_success', { username, isAdmin });
        io.to(0).emit('system_message', `${username} has entered the room.`);
        io.emit('update_users', Object.values(users).map(u => ({ username: u.username, room: u.room })));
        io.emit('update_room_locks', roomLocks);
    });
    
    // Outros eventos que você precisa no servidor
    socket.on('disconnect', () => {
        if (socket.username && users[socket.username]) {
            const room = users[socket.username].room;
            delete users[socket.username];
            io.to(room).emit('system_message', `${socket.username} has left the room.`);
            io.emit('update_users', Object.values(users).map(u => ({ username: u.username, room: u.room })));
        }
    });

    socket.on('send_message', (messageData) => {
        if (socket.username && users[socket.username]) {
            const room = users[socket.username].room;
            io.to(room).emit('new_message', {
                ...messageData,
                username: socket.username
            });
        }
    });

    socket.on('join_room', (newRoom) => {
        if (socket.username && users[socket.username]) {
            if (roomLocks[newRoom] && !users[socket.username].isAdmin) {
                socket.emit('room_locked');
                return;
            }
            socket.leaveAll();
            socket.join(newRoom);
            users[socket.username].room = newRoom;
            io.emit('update_users', Object.values(users).map(u => ({ username: u.username, room: u.room })));
            io.to(newRoom).emit('system_message', `${socket.username} has joined Room ${newRoom}.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
