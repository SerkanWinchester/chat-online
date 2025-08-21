const socket = io();

// Elementos
const openChatBtn = document.getElementById("openChatBtn");
const chatWindow = document.getElementById("chatWindow");
const authPopup = document.getElementById("authPopup");
const settingsPopup = document.getElementById("settingsPopup");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const closeAuth = document.getElementById("closeAuth");
const minimizeAuth = document.getElementById("minimizeAuth");
const minimizeChat = document.getElementById("minimizeChat");

const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");

const settingsBtn = document.getElementById("settingsBtn");
const closeSettings = document.getElementById("closeSettings");
const bgColorPicker = document.getElementById("bgColorPicker");
const bgUpload = document.getElementById("bgUpload");
const bgPreset = document.getElementById("bgPreset");

let currentUser = null;

// Abrir chat
openChatBtn.addEventListener("click", () => {
  if (!currentUser) {
    authPopup.style.display = "block";
  } else {
    chatWindow.style.display = "block";
  }
});

// Login
loginBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  currentUser = username;
  localStorage.setItem("user", username);
  authPopup.style.display = "none";
  chatWindow.style.display = "block";
  socket.emit("login", username);
});

// Cadastro
registerBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const confirm = document.getElementById("confirmPassword").value;
  if (pass !== confirm) {
    alert("Senhas não coincidem!");
    return;
  }
  alert("Cadastro realizado!");
});

// Logout
logoutBtn.addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("user");
  chatWindow.style.display = "none";
  authPopup.style.display = "block";
});

// Minimizar
minimizeChat.addEventListener("click", () => {
  chatWindow.style.display = "none";
});

minimizeAuth.addEventListener("click", () => {
  authPopup.style.display = "none";
});

closeAuth.addEventListener("click", () => {
  authPopup.style.display = "none";
});

// Enviar mensagem
sendBtn.addEventListener("click", () => {
  const msg = chatInput.value;
  if (msg.trim() === "") return;
  socket.emit("message", { user: currentUser, text: msg });
  chatInput.value = "";
});

// Receber mensagens
socket.on("message", (data) => {
  const div = document.createElement("div");
  div.innerHTML = `<b>${data.user}:</b> ${data.text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Configurações
settingsBtn.addEventListener("click", () => {
  settingsPopup.style.display = "block";
});

closeSettings.addEventListener("click", () => {
  settingsPopup.style.display = "none";
});

// Fundo
bgColorPicker.addEventListener("input", (e) => {
  chatWindow.style.background = e.target.value;
});

bgPreset.addEventListener("change", (e) => {
  chatWindow.style.background = `url('${e.target.value}') center/cover no-repeat`;
});

bgUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    chatWindow.style.background = `url('${reader.result}') center/cover no-repeat`;
  };
  reader.readAsDataURL(file);
});
