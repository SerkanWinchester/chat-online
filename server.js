const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

let users = {};

// Função para salvar usuários em um arquivo
const saveUsers = () => {
    fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {
        if (err) {
            console.error('Erro ao salvar usuários:', err);
        } else {
            console.log('Usuários salvos com sucesso.');
        }
    });
};

// Carrega usuários do arquivo ao iniciar
const loadUsers = () => {
    if (fs.existsSync(USERS_FILE)) {
        fs.readFile(USERS_FILE, 'utf8', (err, data) => {
            if (err) {
                console.error('Erro ao ler usuários:', err);
            } else {
                users = JSON.parse(data);
                console.log('Usuários carregados:', Object.keys(users));
            }
        });
    }
};

loadUsers();

// Middleware para JSON e CORS
app.use(express.json());
app.use(cors());

// Serve os arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Endpoint de registro
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        return res.status(409).json({ success: false, message: 'Usuário já existe.' });
    }
    users[username] = { password: password };
    saveUsers();
    res.json({ success: true, message: 'Usuário registrado com sucesso.' });
});

// Endpoint de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        res.json({ success: true, message: 'Login bem-sucedido.' });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
    }
});

// Lógica de WebSocket para o chat
let onlineUsers = {};

io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    socket.on('user connected', (user) => {
        onlineUsers[socket.id] = user;
        io.emit('user list update', Object.values(onlineUsers));
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
        delete onlineUsers[socket.id];
        io.emit('user list update', Object.values(onlineUsers));
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
