const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on("connection", (socket) => {
  console.log("Novo usuário conectado");

  socket.on("login", (user) => {
    socket.username = user;
    io.emit("message", { user: "Sistema", text: `${user} entrou no chat.` });
  });

  socket.on("message", (data) => {
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      io.emit("message", { user: "Sistema", text: `${socket.username} saiu do chat.` });
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
