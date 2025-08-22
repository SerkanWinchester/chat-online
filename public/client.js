document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- ESTADO GLOBAL ---
    let currentUser = null;
    let isSoundMuted = false;
    let friends = [];
    let openPrivateChats = {};
    let typingTimeout;

    // --- REFERÊNCIAS AO DOM ---
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const loginScreen = document.querySelector('.login-screen');
    const chatScreen = document.querySelector('.chat-screen');
    const settingsScreen = document.querySelector('.settings-screen');
    const mainChatBody = document.getElementById('main-chat-body');
    const mainChatFooter = document.getElementById('main-chat-footer');
    const myUsernameDisplay = document.getElementById('my-username');
    const privateChatsContainer = document.getElementById('private-chats-container');
    const privateUserListModal = document.getElementById('private-user-list-modal');
    const notificationSound = document.getElementById('notification-sound');
    const screamSound = document.getElementById('scream-sound');
    const typingIndicator = document.getElementById('typing-indicator');

    // Botões
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const privateChatBtn = document.getElementById('private-chat-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const switchToRegisterLink = document.getElementById('switch-to-register');
    const switchToLoginLink = document.getElementById('switch-to-login');

    // --- FUNÇÕES AUXILIARES ---
    const playSound = (soundElement) => {
        if (!isSoundMuted && soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(e => {});
        }
    };
    const showScreen = (screenToShow) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screenToShow.classList.add('active');
    };

    // --- FUNÇÕES DE MENSAGEM ---
    function createMessageBubble(data) {
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');

        if (data.user === 'Sistema') {
            bubble.classList.add('system-message');
            bubble.textContent = data.text;
        } else {
            bubble.innerHTML = `<strong>${data.user}:</strong> <span>${data.text}</span>`;
            if (data.user === currentUser) {
                bubble.classList.add('my-message');
            } else {
                bubble.classList.add('other-message');
                playSound(notificationSound);
            }
        }
        return bubble;
    }
    
    // --- FUNÇÕES DO CHAT PRINCIPAL ---
    function initializeMainChatFooter() {
        const footerHTML = `
            <input type="text" class="message-input" placeholder="Digite sua mensagem...">
            <button class="send-btn" title="Enviar"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
        `;
        mainChatFooter.insertAdjacentHTML('beforeend', footerHTML);
        const messageInput = mainChatFooter.querySelector('.message-input');
        const sendBtn = mainChatFooter.querySelector('.send-btn');

        sendBtn.addEventListener('click', () => {
            const text = messageInput.value.trim();
            if (text) {
                socket.emit('send_general_message', { user: currentUser, text });
                messageInput.value = '';
                socket.emit('user_stopped_typing');
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendBtn.click();
        });

        messageInput.addEventListener('input', () => {
            clearTimeout(typingTimeout);
            socket.emit('user_typing', currentUser);
            typingTimeout = setTimeout(() => {
                socket.emit('user_stopped_typing');
            }, 1500);
        });
    }

    // --- FUNÇÕES DE CHAT PRIVADO ---
    function createOrFocusPrivateChat(username) {
        if (openPrivateChats[username]) {
            // Focar na janela se já estiver aberta
            return;
        }

        const windowEl = document.createElement('div');
        windowEl.className = 'private-chat-window';
        windowEl.dataset.user = username;
        windowEl.innerHTML = `
            <div class="private-chat-header"><span>Chat com ${username}</span><div class="private-chat-header-buttons">
                <button class="private-nudge-btn" title="Puxão">Puxão</button>
                <button class="private-chat-close-btn" title="Fechar">&times;</button>
            </div></div>
            <div class="chat-body private-chat-messages"></div>
            <div class="chat-footer"></div>`;
        
        privateChatsContainer.appendChild(windowEl);
        openPrivateChats[username] = windowEl;

        const chatFooter = windowEl.querySelector('.chat-footer');
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.className = 'message-input';
        messageInput.placeholder = 'Digite sua mensagem...';
        chatFooter.appendChild(messageInput);

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && messageInput.value.trim()) {
                const text = messageInput.value.trim();
                socket.emit('send_private_message', { from: currentUser, to: username, text });
                messageInput.value = '';
            }
        });

        windowEl.querySelector('.private-nudge-btn').addEventListener('click', () => {
            socket.emit('send_nudge', { from: currentUser, to: username });
        });
        windowEl.querySelector('.private-chat-close-btn').addEventListener('click', () => {
            windowEl.remove();
            delete openPrivateChats[username];
        });
    }

    // --- EVENTOS DE SOCKET (Recebidos do Servidor) ---
    socket.on('receive_general_message', (data) => {
        mainChatBody.appendChild(createMessageBubble(data));
        mainChatBody.scrollTop = mainChatBody.scrollHeight;
    });

    socket.on('receive_private_message', (data) => {
        const partner = data.from === currentUser ? data.to : data.from;
        if (!openPrivateChats[partner]) {
            createOrFocusPrivateChat(partner);
        }
        const chatWindow = openPrivateChats[partner];
        const chatBody = chatWindow.querySelector('.chat-body');
        chatBody.appendChild(createMessageBubble({ user: data.from, text: data.text }));
        chatBody.scrollTop = chatBody.scrollHeight;
        playSound(notificationSound);
    });

    socket.on('system_message', (text) => {
        mainChatBody.appendChild(createMessageBubble({ user: 'Sistema', text }));
        mainChatBody.scrollTop = mainChatBody.scrollHeight;
    });
    
    socket.on('update_user_list', (userList) => {
        friends = userList;
        const listElement = privateUserListModal.querySelector('ul');
        listElement.innerHTML = '';
        friends.forEach(user => {
            if (user !== currentUser) {
                const li = document.createElement('li');
                li.textContent = user;
                li.style.cursor = 'pointer';
                li.onclick = () => {
                    createOrFocusPrivateChat(user);
                    privateUserListModal.style.display = 'none';
                };
                listElement.appendChild(li);
            }
        });
    });

    socket.on('nudge_received', (data) => {
        const chatWindow = openPrivateChats[data.from];
        if (chatWindow) {
            chatWindow.classList.add('shake');
            playSound(screamSound);
            setTimeout(() => chatWindow.classList.remove('shake'), 820);
        }
    });

    socket.on('show_typing_indicator', (username) => {
        typingIndicator.textContent = `${username} está digitando...`;
    });
    socket.on('hide_typing_indicator', () => {
        typingIndicator.textContent = '';
    });

    // --- EVENTOS DA PÁGINA ---
    chatIcon.addEventListener('click', () => chatWindow.classList.toggle('show'));
    minimizeBtn.addEventListener('click', () => chatWindow.classList.remove('show'));
    
    const handleLogin = (username) => {
        if (username) {
            currentUser = username;
            myUsernameDisplay.textContent = currentUser;
            socket.emit('user_login', currentUser);
            showScreen(chatScreen);
        }
    };
    
    loginBtn.addEventListener('click', () => handleLogin(document.getElementById('login-username').value.trim()));
    registerBtn.addEventListener('click', () => handleLogin(document.getElementById('register-username').value.trim()));

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.reload();
    });

    soundToggleBtn.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        soundToggleBtn.innerHTML = isSoundMuted ? '🔇' : '🔔';
    });

    settingsBtn.addEventListener('click', () => showScreen(settingsScreen));
    backToChatBtn.addEventListener('click', () => showScreen(chatScreen));
    switchToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showScreen(registerScreen); });
    switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showScreen(loginScreen); });

    privateChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        privateUserListModal.style.display = 'block';
    });
    document.addEventListener('click', (e) => {
        if (!privateUserListModal.contains(e.target) && !privateChatBtn.contains(e.target)) {
            privateUserListModal.style.display = 'none';
        }
    });

    // --- INICIALIZAÇÃO ---
    initializeMainChatFooter();
});
