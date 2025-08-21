// Conexão com o servidor do Render
const socket = io('https://meu-chat-lin7.onrender.com');

// Elementos do DOM
const openChatBtn = document.getElementById('openChatBtn');
const authPopup = document.getElementById('authPopup');
const chatWindow = document.getElementById('chatWindow');
const settingsPopup = document.getElementById('settingsPopup');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const minimizeAuthBtn = document.getElementById('minimizeAuth');
const closeAuthBtn = document.getElementById('closeAuth');
const minimizeChatBtn = document.getElementById('minimizeChat');

const bgColorPicker = document.getElementById('bgColorPicker');
const bgUpload = document.getElementById('bgUpload');
const bgPreset = document.getElementById('bgPreset');
const closeSettingsBtn = document.getElementById('closeSettings');

// Variáveis de estado
let currentUser = null;
let users = {};

// Funções de UI
function toggleWindow(element) {
  element.style.display = (element.style.display === 'flex') ? 'none' : 'flex';
}

function closeWindow(element) {
  element.style.display = 'none';
}

function minimizeWindow(element) {
  element.style.display = 'none';
}

function showAuth() {
  closeWindow(chatWindow);
  toggleWindow(authPopup);
}

function showChat() {
  closeWindow(authPopup);
  toggleWindow(chatWindow);
}

function showSettings() {
  toggleWindow(settingsPopup);
}

function setBgColor() {
  document.body.style.backgroundColor = bgColorPicker.value;
  document.body.style.backgroundImage = 'none';
}

function setBgImage(url) {
  document.body.style.backgroundImage = `url('${url}')`;
}

function register() {
  if (passwordInput.value !== confirmPasswordInput.value) {
    alert('As senhas não coincidem!');
    return;
  }
  if (users[usernameInput.value]) {
    alert('Usuário já existe!');
    return;
  }
  users[usernameInput.value] = { password: passwordInput.value };
  alert('Usuário cadastrado com sucesso!');
  login();
}

function login() {
  if (users[usernameInput.value] && users[usernameInput.value].password === passwordInput.value) {
    currentUser = usernameInput.value;
    alert('Login realizado com sucesso!');
    socket.emit('user connected', { name: currentUser });
    showChat();
  } else {
    alert('Usuário ou senha incorretos!');
  }
}

function logout() {
  currentUser = null;
  socket.disconnect();
  location.reload();
}

function sendMessage() {
  const message = chatInput.value.trim();
  if (message && currentUser) {
    socket.emit('chat message', { user: currentUser, text: message });
    chatInput.value = '';
    scrollToBottom();
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Lógica de arrastar janelas
function makeDraggable(element, header) {
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    element.style.left = `${e.clientX - offsetX}px`;
    element.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    element.style.cursor = 'grab';
  });
}

// Event Listeners
openChatBtn.addEventListener('click', showAuth);
minimizeAuthBtn.addEventListener('click', () => minimizeWindow(authPopup));
closeAuthBtn.addEventListener('click', () => closeWindow(authPopup));
loginBtn.addEventListener('click', login);
registerBtn.addEventListener('click', register);
logoutBtn.addEventListener('click', logout);
settingsBtn.addEventListener('click', showSettings);
minimizeChatBtn.addEventListener('click', () => minimizeWindow(chatWindow));
closeSettingsBtn.addEventListener('click', () => closeWindow(settingsPopup));
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
bgColorPicker.addEventListener('input', setBgColor);
bgPreset.addEventListener('change', (e) => {
  if (e.target.value) {
    setBgImage(e.target.value);
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  makeDraggable(authPopup, authPopup.querySelector('.popup-header'));
  makeDraggable(chatWindow, chatWindow.querySelector('.chat-header'));
  makeDraggable(settingsPopup, settingsPopup.querySelector('.popup-header'));
});

// Recebe mensagens do servidor
socket.on('chat message', (msg) => {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  messageDiv.textContent = `${msg.user}: ${msg.text}`;
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
});
