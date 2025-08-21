const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve os arquivos da pasta public
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("Novo usuário conectado:", socket.id);

    socket.on("chatMessage", (data) => {
        console.log("Mensagem recebida:", data);
        io.emit("chatMessage", data); // envia para todos os clientes
    });

    socket.on("disconnect", () => {
        console.log("Usuário desconectou:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
