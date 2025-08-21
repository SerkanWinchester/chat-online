const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
app.use(cors()); // Blogspot/Blogger vão carregar de outro domínio

// opcional: servir o frontend local (Render pode servir /public se você quiser abrir direto)
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/**
 * users: Map<socketId, { id, name, blocked:Set<socketId> }>
 */
const users = new Map();

function broadcastUsers() {
  const list = Array.from(users.values()).map(u => ({ id: u.id, name: u.name }));
  io.emit("onlineUsers", list);
}

io.on("connection", (socket) => {
  // cria estrutura do usuário (nome chega depois via register)
  users.set(socket.id, { id: socket.id, name: `User-${socket.id.slice(0,5)}`, blocked: new Set() });
  broadcastUsers();

  socket.on("register", ({ name }) => {
    const u = users.get(socket.id);
    if (!u) return;
    if (name && typeof name === "string") {
      u.name = name.trim().slice(0, 40) || u.name;
    }
    broadcastUsers();
  });

  // mensagem pública
  socket.on("chatMessage", ({ msg }) => {
    const sender = users.get(socket.id);
    if (!sender || !msg || typeof msg !== "string") return;

    const payload = { from: sender.id, user: sender.name, msg: msg.slice(0, 2000) };

    // entrega seletiva, respeitando bloqueios (não entrega a quem bloqueou o remetente e nem a quem o remetente bloqueou)
    for (const [id, s] of io.sockets.sockets) {
      const recipient = users.get(id);
      if (!recipient) continue;
      const blockedByRecipient = recipient.blocked.has(sender.id);
      const senderBlockedRecipient = sender.blocked.has(recipient.id);
      if (blockedByRecipient || senderBlockedRecipient) continue;
      s.emit("chatMessage", payload);
    }
  });

  // mensagem privada
  socket.on("privateMessage", ({ to, msg }) => {
    const sender = users.get(socket.id);
    const recipient = users.get(to);
    if (!sender || !recipient || !msg || typeof msg !== "string") return;

    // se qualquer lado bloqueou, não entrega
    if (recipient.blocked.has(sender.id) || sender.blocked.has(recipient.id)) return;

    const payload = {
      from: sender.id,
      fromName: sender.name,
      to: recipient.id,
      msg: msg.slice(0, 2000)
    };

    // entrega ao destinatário e ecoa ao remetente (para exibir na janela)
    io.to(recipient.id).emit("privateMessage", payload);
    io.to(sender.id).emit("privateMessage", payload);
  });

  // bloquear/desbloquear
  socket.on("blockUser", ({ targetId }) => {
    const me = users.get(socket.id);
    if (!me || !targetId) return;
    me.blocked.add(targetId);
    socket.emit("blockedUsers", Array.from(me.blocked));
  });

  socket.on("unblockUser", ({ targetId }) => {
    const me = users.get(socket.id);
    if (!me || !targetId) return;
    me.blocked.delete(targetId);
    socket.emit("blockedUsers", Array.from(me.blocked));
  });

  // envia lista de bloqueados sob demanda
  socket.on("getBlocked", () => {
    const me = users.get(socket.id);
    if (!me) return;
    socket.emit("blockedUsers", Array.from(me.blocked));
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    broadcastUsers();
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
