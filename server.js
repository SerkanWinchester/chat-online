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

io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);
    
    socket.on('login', (username) => {
        if (users[username]) {
            socket.emit('login_error', 'Username already exists. Please choose another one.');
            return;
        }
        
        const isAdmin = adminPasswords.hasOwnProperty(username.toLowerCase());
        
        if (isAdmin) {
            socket.emit('admin_login_challenge');
            socket.once('admin_password_submit', (password) => {
                if (password === adminPasswords[username.toLowerCase()]) {
                    users[username] = { id: socket.id, username, room: 0, isAdmin: true };
                    socket.join(0);
                    socket.username = username;
                    socket.emit('login_success', { username, isAdmin: true });
                    io.to(0).emit('system_message', `${username} (Admin) has entered the room.`);
                    io.emit('update_data', { users: Object.values(users), roomLocks, messages });
                } else {
                    socket.emit('login_error', 'Incorrect password. Access denied.');
                }
            });
        } else {
            users[username] = { id: socket.id, username, room: 0, isAdmin: false };
            socket.join(0);
            socket.username = username;
            socket.emit('login_success', { username, isAdmin: false });
            io.to(0).emit('system_message', `${username} has entered the room.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages });
        }
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            const room = users[socket.username].room;
            delete users[socket.username];
            io.to(room).emit('system_message', `${socket.username} has left the room.`);
            io.emit('update_data', { users: Object.values(users), roomLocks, messages });
        }
    });

    socket.on('send_message', (messageData) => {
        if (socket.username) {
            const room = users[socket.username].room;
            const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            messages[messageId] = {
                id: messageId,
                username: socket.username,
                content: messageData.content,
                timestamp: new Date(),
                reactions: {}
            };
            io.to(room).emit('new_message', messages[messageId]);
        }
    });
    
    socket.on('edit_message', (data) => {
        if (messages[data.id] && messages[data.id].username === socket.username) {
            messages[data.id].content = data.content;
            io.to(users[socket.username].room).emit('update_message', messages[data.id]);
        }
    });

    socket.on('delete_message', (messageId) => {
        if (messages[messageId] && messages[messageId].username === socket.username) {
            delete messages[messageId];
            io.to(users[socket.username].room).emit('delete_message', messageId);
        }
    });

    socket.on('join_room', (newRoom) => {
        if (socket.username) {
            if (roomLocks[newRoom] && !users[socket.username].isAdmin) {
                socket.emit('room_locked');
                return;
            }
            socket.leaveAll();
            socket.join(newRoom);
            users[socket.username].room = newRoom;
            io.emit('update_data', { users: Object.values(users), roomLocks, messages });
            io.to(newRoom).emit('system_message', `${socket.username} has joined Room ${newRoom}.`);
        }
    });
    
    socket.on('add_reaction', ({ messageId, reaction }) => {
        if (messages[messageId]) {
            if (!messages[messageId].reactions[reaction]) {
                messages[messageId].reactions[reaction] = 0;
            }
            messages[messageId].reactions[reaction]++;
            io.emit('update_reactions', { messageId, reactions: messages[messageId].reactions });
        }
    });
    
    socket.on('remove_reaction', ({ messageId, reaction }) => {
        if (messages[messageId] && messages[messageId].reactions[reaction]) {
            messages[messageId].reactions[reaction]--;
            if (messages[messageId].reactions[reaction] <= 0) {
                delete messages[messageId].reactions[reaction];
            }
            io.emit('update_reactions', { messageId, reactions: messages[messageId].reactions });
        }
    });

    socket.on('call_attention', (data) => {
        if (socket.username) {
            const targetSocket = Object.values(io.sockets.sockets).find(s => s.username === data.user);
            if (data.user === 'all') {
                io.to(users[socket.username].room).emit('attention_call', data);
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
            io.emit('update_data', { users: Object.values(users), roomLocks, messages });
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
