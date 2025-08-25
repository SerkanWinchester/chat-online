const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Estruturas de dados
const users = {}; // chave = socket.id
const usernameToId = {}; // chave = username -> valor = socket.id
const roomLocks = { 0: false };
const adminPasswords = { 'serkan': '51995429192', 'elieser': '51995429192' };
const roomMessages = {}; // histórico de mensagens por sala
const messageReactions = {};

// Limites de salas
const ROOM_LIMITS = {
    DEFAULT: 20,
    MAIN_ROOM: 100
};

// Função auxiliar: próxima sala disponível
function findNextAvailableRoom() {
    let room = 1;
    let roomCount;
    do {
        roomCount = Object.values(users).filter(u => u.room === room).length;
        if (roomCount < ROOM_LIMITS.DEFAULT) {
            return room;
        }
        room++;
    } while (true);
}

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Estado inicial
    socket.emit('initial_data', {
        users: Object.values(users).map(u => ({
            username: u.username, room: u.room, isAdmin: u.isAdmin
        })),
        roomLocks,
        messages: roomMessages[0] || {},
        messageReactions
    });

    // Login
    socket.on('login', (username) => {
        if (usernameToId[username]) {
            socket.emit('login_error', 'Username already exists. Please choose another one.');
            return;
        }

        const isAdmin = adminPasswords.hasOwnProperty(username.toLowerCase());
        let targetRoom = 0;
        const mainRoomUsers = Object.values(users).filter(u => u.room === 0).length;

        if (mainRoomUsers >= ROOM_LIMITS.MAIN_ROOM) {
            targetRoom = findNextAvailableRoom();
        }

        const finalizeLogin = (isAdminFlag) => {
            users[socket.id] = { id: socket.id, username, room: targetRoom, isAdmin: isAdminFlag };
            usernameToId[username] = socket.id;
            socket.join(targetRoom);
            socket.username = username;
            socket.emit('login_success', { username, isAdmin: isAdminFlag, room: targetRoom });
            io.to(targetRoom).emit('system_message', `${username}${isAdminFlag ? ' (Admin)' : ''} has entered Room ${targetRoom}.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        };

        if (isAdmin) {
            socket.emit('admin_login_challenge');
            socket.once('admin_password_submit', (password) => {
                if (password === adminPasswords[username.toLowerCase()]) {
                    finalizeLogin(true);
                } else {
                    socket.emit('login_error', 'Incorrect password. Access denied.');
                }
            });
        } else {
            finalizeLogin(false);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            const user = users[socket.id];
            const room = user.room;
            delete usernameToId[socket.username];
            delete users[socket.id];
            io.to(room).emit('system_message', `${socket.username} has left the room.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        }
    });

    // Mensagens
    socket.on('send_message', (messageData) => {
        if (socket.username) {
            const room = users[socket.id].room;
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            if (!roomMessages[room]) roomMessages[room] = {};
            roomMessages[room][messageId] = {
                id: messageId,
                username: socket.username,
                content: messageData.content,
                timestamp: new Date(),
                reactions: {}
            };
            io.to(room).emit('new_message', roomMessages[room][messageId]);
        }
    });

    socket.on('edit_message', (data) => {
        const room = users[socket.id].room;
        if (roomMessages[room] && roomMessages[room][data.id] && roomMessages[room][data.id].username === socket.username) {
            roomMessages[room][data.id].content = data.content;
            io.to(room).emit('update_message', roomMessages[room][data.id]);
        }
    });

    socket.on('delete_message', (messageId) => {
        const room = users[socket.id].room;
        if (roomMessages[room] && roomMessages[room][messageId] && roomMessages[room][messageId].username === socket.username) {
            delete roomMessages[room][messageId];
            io.to(room).emit('delete_message', messageId);
        }
    });

    // Salas
    socket.on('join_room', (newRoom) => {
        if (socket.username) {
            if (roomLocks[newRoom] && !users[socket.id].isAdmin) {
                socket.emit('room_locked');
                return;
            }

            const currentRoom = users[socket.id].room;
            socket.leave(currentRoom);

            if (newRoom >= 101) {
                const roomUserCount = Object.values(users).filter(u => u.room === newRoom).length;
                if (roomUserCount >= ROOM_LIMITS.DEFAULT) {
                    socket.emit('join_room_error', 'This room is full. Please try another one.');
                    return;
                }
            }

            socket.join(newRoom);
            users[socket.id].room = newRoom;
            socket.emit('initial_room_messages', roomMessages[newRoom] || {});

            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
            io.to(newRoom).emit('system_message', `${socket.username} has joined Room ${newRoom}.`);
            io.to(currentRoom).emit('system_message', `${socket.username} has left Room ${currentRoom}.`);
        }
    });

    // Reações
    socket.on('add_reaction', ({ messageId, reaction }) => {
        const room = users[socket.id].room;
        if (roomMessages[room] && roomMessages[room][messageId]) {
            if (!roomMessages[room][messageId].reactions[reaction]) {
                roomMessages[room][messageId].reactions[reaction] = 0;
            }
            roomMessages[room][messageId].reactions[reaction]++;
            io.emit('update_reactions', { messageId, reactions: roomMessages[room][messageId].reactions });
        }
    });

    // Chamar atenção
    socket.on('call_attention', (data) => {
        if (socket.username) {
            const room = users[socket.id].room;
            if (data.user === 'all') {
                io.to(room).emit('attention_call', data);
            } else {
                const targetId = usernameToId[data.user];
                if (targetId) {
                    io.to(targetId).emit('attention_call', data);
                }
            }
        }
    });

    // Admin
    socket.on('admin_toggle_lock', (room) => {
        if (users[socket.id] && users[socket.id].isAdmin) {
            if (!roomLocks.hasOwnProperty(room)) {
                roomLocks[room] = false;
            }
            roomLocks[room] = !roomLocks[room];
            io.emit('system_message', `Room ${room} was ${roomLocks[room] ? 'locked' : 'unlocked'} by the Admin.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        }
    });

    socket.on('send_global_message', (messageData) => {
        if (users[socket.id] && users[socket.id].isAdmin) {
            io.emit('global_message', messageData);
        }
    });

    socket.on('kick_user', (userToKick) => {
        if (users[socket.id] && users[socket.id].isAdmin) {
            const targetId = usernameToId[userToKick];
            if (targetId) {
                io.to(targetId).emit('kick_success');
                io.sockets.sockets.get(targetId)?.disconnect(true);
            }
        }
    });

    // Busca
    socket.on('search_user', (userToFind) => {
        for (const [username, id] of Object.entries(usernameToId)) {
            if (username.toLowerCase().includes(userToFind.toLowerCase())) {
                socket.emit('search_result', { username, room: users[id].room });
                return;
            }
        }
        socket.emit('search_result', null);
    });

    socket.on('search_room', (roomToFind) => {
        const usersInRoom = Object.values(users).filter(u => u.room === roomToFind).map(u => u.username);
        socket.emit('search_result_room', usersInRoom);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
