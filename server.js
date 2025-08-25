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

const users = {};
const roomLocks = { 0: false };
const adminPasswords = { 'serkan': '51995429192', 'elieser': '51995429192' };
const messages = {};
const messageReactions = {};

// Adiciona os limites de usuários por sala
const ROOM_LIMITS = {
    DEFAULT: 20, // Limite para salas acima da 100 (salas 101, 102, etc.)
    MAIN_ROOM: 100 // Limite para a sala principal (Sala 0)
};

// Função auxiliar para encontrar a próxima sala disponível
function findNextAvailableRoom() {
    let room = 1;
    let roomCount;
    do {
        // Conta quantos usuários estão na sala 'room'
        roomCount = Object.values(users).filter(u => u.room === room).length;
        if (roomCount < ROOM_LIMITS.DEFAULT) {
            return room; // Retorna a primeira sala livre encontrada
        }
        room++;
    } while (true);
}

// Guarda o histórico de mensagens por sala
const roomMessages = {};

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);
    
    // Envia o estado inicial para o novo usuário
    // A sala 0 é sempre a sala de login/início
    socket.emit('initial_data', {
        users: Object.values(users).map(u => ({ username: u.username, room: u.room, isAdmin: u.isAdmin })),
        roomLocks,
        messages: roomMessages[0] || {},
        messageReactions
    });

    socket.on('login', (username) => {
        if (users[username]) {
            socket.emit('login_error', 'Username already exists. Please choose another one.');
            return;
        }
    
        const isAdmin = adminPasswords.hasOwnProperty(username.toLowerCase());
        
        let targetRoom = 0;
        const mainRoomUsers = Object.values(users).filter(u => u.room === 0).length;

        // Se a sala 0 atingiu o limite, redireciona para a próxima sala disponível
        if (mainRoomUsers >= ROOM_LIMITS.MAIN_ROOM) {
            targetRoom = findNextAvailableRoom();
        }

        if (isAdmin) {
            socket.emit('admin_login_challenge');
            socket.once('admin_password_submit', (password) => {
                if (password === adminPasswords[username.toLowerCase()]) {
                    users[username] = { id: socket.id, username, room: targetRoom, isAdmin: true };
                    socket.join(targetRoom);
                    socket.username = username;
                    socket.emit('login_success', { username, isAdmin: true, room: targetRoom });
                    io.to(targetRoom).emit('system_message', `${username} (Admin) has entered Room ${targetRoom}.`);
                    io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
                } else {
                    socket.emit('login_error', 'Incorrect password. Access denied.');
                }
            });
        } else {
            users[username] = { id: socket.id, username, room: targetRoom, isAdmin: false };
            socket.join(targetRoom);
            socket.username = username;
            socket.emit('login_success', { username, isAdmin: false, room: targetRoom });
            io.to(targetRoom).emit('system_message', `${username} has entered Room ${targetRoom}.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        }
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            const room = users[socket.username].room;
            delete users[socket.username];
            io.to(room).emit('system_message', `${socket.username} has left the room.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        }
    });

    socket.on('send_message', (messageData) => {
        if (socket.username) {
            const room = users[socket.username].room;
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Inicializa o array de mensagens para a sala se ainda não existir
            if (!roomMessages[room]) {
                roomMessages[room] = {};
            }
            
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
        const room = users[socket.username].room;
        if (roomMessages[room] && roomMessages[room][data.id] && roomMessages[room][data.id].username === socket.username) {
            roomMessages[room][data.id].content = data.content;
            io.to(room).emit('update_message', roomMessages[room][data.id]);
        }
    });

    socket.on('delete_message', (messageId) => {
        const room = users[socket.username].room;
        if (roomMessages[room] && roomMessages[room][messageId] && roomMessages[room][messageId].username === socket.username) {
            delete roomMessages[room][messageId];
            io.to(room).emit('delete_message', messageId);
        }
    });

    socket.on('join_room', (newRoom) => {
        if (socket.username) {
            if (roomLocks[newRoom] && !users[socket.username].isAdmin) {
                socket.emit('room_locked');
                return;
            }

            const currentRoom = users[socket.username].room;
            socket.leave(currentRoom);
            
            // Lógica de limite para salas 101+
            if (newRoom >= 101) {
                const roomUserCount = Object.values(users).filter(u => u.room === newRoom).length;
                if (roomUserCount >= ROOM_LIMITS.DEFAULT) {
                    socket.emit('join_room_error', 'This room is full. Please try another one.');
                    return;
                }
            }
            
            socket.join(newRoom);
            users[socket.username].room = newRoom;
            
            // Envia o histórico de mensagens da nova sala
            socket.emit('initial_room_messages', roomMessages[newRoom] || {});

            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
            io.to(newRoom).emit('system_message', `${socket.username} has joined Room ${newRoom}.`);
            io.to(currentRoom).emit('system_message', `${socket.username} has left Room ${currentRoom}.`);
        }
    });
    
    socket.on('add_reaction', ({ messageId, reaction }) => {
        const room = users[socket.username].room;
        if (roomMessages[room] && roomMessages[room][messageId]) {
            if (!roomMessages[room][messageId].reactions[reaction]) {
                roomMessages[room][messageId].reactions[reaction] = 0;
            }
            roomMessages[room][messageId].reactions[reaction]++;
            io.emit('update_reactions', { messageId, reactions: roomMessages[room][messageId].reactions });
        }
    });

    socket.on('call_attention', (data) => {
        if (socket.username) {
            const room = users[socket.username].room;
            const targetSocket = Object.values(io.sockets.sockets).find(s => s.username === data.user);
            if (data.user === 'all') {
                io.to(room).emit('attention_call', data);
            } else if (targetSocket) {
                targetSocket.emit('attention_call', data);
            }
        }
    });

    socket.on('admin_toggle_lock', (room) => {
        if (users[socket.username] && users[socket.username].isAdmin) {
            if (!roomLocks.hasOwnProperty(room)) {
                roomLocks[room] = false;
            }
            roomLocks[room] = !roomLocks[room];
            io.emit('system_message', `Room ${room} was ${roomLocks[room] ? 'locked' : 'unlocked'} by the Admin.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages: roomMessages, messageReactions });
        }
    });
    
    socket.on('send_global_message', (messageData) => {
        if (users[socket.username] && users[socket.username].isAdmin) {
             io.emit('global_message', messageData);
        }
    });

    socket.on('kick_user', (userToKick) => {
        if (users[socket.username] && users[socket.username].isAdmin) {
            const userSocket = Object.values(io.sockets.sockets).find(s => s.username === userToKick);
            if (userSocket) {
                userSocket.emit('kick_success');
                userSocket.disconnect(true);
            }
        }
    });
    
    socket.on('search_user', (userToFind) => {
        for (const user in users) {
            if (user.toLowerCase().includes(userToFind.toLowerCase())) {
                socket.emit('search_result', {
                    username: user,
                    room: users[user].room
                });
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
