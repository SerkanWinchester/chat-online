// public/widget.js
(function() {
    // URL do seu servidor no Render
    const SERVER_URL = "https://meu-chat-lin7.onrender.com";

    // 1. O HTML do seu chat, como uma string
    const chatHTML = `
        <div id="chat-container">
            <div id="chat-icon"><img src="https://cdn-icons-png.flaticon.com/512/134/134914.png" alt="Ícone de Chat" /></div>
            <div id="chat-window">
                <div class="screen login-screen active">
                    <h3>Login</h3><p>Entre com seu @username.</p>
                    <input type="text" id="login-username" placeholder="@username" />
                    <button id="login-btn">Entrar</button>
                </div>
                <div class="screen chat-screen">
                    <div class="chat-header">
                        <div class="header-left"><span id="my-username"></span></div>
                        <h3>Chat Geral</h3>
                        <div class="header-right header-controls">
                            <button id="private-chat-btn" title="Chat Privado">🔒</button>
                            <button id="sound-toggle-btn" title="Silenciar notificações">🔔</button>
                            <a href="#" id="logout-btn" class="logout-link">Logout</a>
                        </div>
                    </div>
                    <div id="main-chat-body" class="chat-body"></div>
                    <div id="main-chat-footer" class="chat-footer"></div>
                    <div id="private-user-list-modal">
                        <p><strong>Iniciar chat com:</strong></p>
                        <ul id="private-user-list"></ul>
                    </div>
                </div>
            </div>
        </div>
        <div id="private-chats-container"></div>
        <audio id="notification-sound" src="https://www.myinstants.com/media/sounds/blip_1.mp3" preload="auto"></audio>
        <audio id="nudge-sound" src="https://soundjay.com/misc/sounds/knocking-on-door-1.mp3" preload="auto"></audio>
    `;

    // 2. O CSS do seu chat, como uma string
    const chatCSS = `
        #chat-container, #private-chats-container { font-family: Arial, sans-serif; }
        #chat-container { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; }
        #chat-icon { width: 60px; height: 60px; background-color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.3s; animation: cw-pulse 1.5s infinite; box-shadow: 0 0 10px rgba(0,0,0,0.3); }
        #chat-icon:hover { transform: scale(1.1); }
        #chat-icon img { width: 40px; height: 40px; }
        @keyframes cw-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        #chat-window { width: 380px; height: 500px; position: fixed; bottom: 90px; right: 20px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); overflow: hidden; display: none; flex-direction: column; transition: all 0.5s ease; transform-origin: bottom right; }
        #chat-window.show { display: flex; }
        .chat-header { background-color: #dcdcdc; color: #000; padding: 10px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; flex-shrink: 0; }
        .header-left, .header-right { display: flex; align-items: center; gap: 5px; }
        .chat-header h3 { margin: 0; flex-grow: 1; text-align: center; font-size: 16px; }
        .header-controls button { background: none; border: none; cursor: pointer; padding: 5px; font-size: 18px; }
        .logout-link { color: #000; font-size: 14px; text-decoration: none; }
        .screen { flex-grow: 1; display: none; flex-direction: column; height: 100%; box-sizing: border-box; }
        .screen.active { display: flex; }
        .login-screen { padding: 20px; text-align: center; justify-content: center; align-items: center; }
        .login-screen input { width: 80%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; }
        .login-screen button { width: 80%; padding: 10px; background-color: #333; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .chat-body { flex-grow: 1; padding: 10px; overflow-y: auto; }
        .chat-footer { flex-shrink: 0; display: flex; padding: 8px; border-top: 1px solid #ccc; background: #dcdcdc; gap: 5px; }
        .message-input { flex-grow: 1; border: 1px solid #ccc; border-radius: 20px; padding: 8px 12px; }
        .message-bubble { background: #fff; border-radius: 12px; padding: 10px; margin-bottom: 8px; max-width: 85%; word-wrap: break-word; }
        .message-bubble strong { color: #0056b3; }
        .system-message { color: #777; font-style: italic; text-align: center; margin: 10px 0; font-size: 0.9em; width: 100%;}
        #private-chats-container { position: fixed; bottom: 20px; right: 410px; z-index: 2147483646; display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 5px; }
        .private-chat-window { width: 300px; height: 400px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; }
        .private-chat-header { padding: 8px; }
        .private-chat-header > div { display: flex; gap: 8px; }
        #private-user-list-modal { display:none; position:absolute; bottom: 100%; right:0; background-color: white; border: 1px solid #ccc; padding: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-radius: 8px;}
        #private-user-list-modal ul { list-style: none; padding: 0; margin: 0; }
        #private-user-list-modal li { padding: 5px; cursor: pointer; border-radius: 4px; }
        #private-user-list-modal li:hover { background-color: #f0f0f0; }
        @keyframes cw-shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        .shake { animation: cw-shake 0.82s cubic-bezier(.36,.07,.19,.97) both; }
    `;

    // 3. Injeta o HTML e o CSS na página do blog
    document.head.insertAdjacentHTML('beforeend', `<style>${chatCSS}</style>`);
    document.body.insertAdjacentHTML('beforeend', chatHTML);

    // 4. Carrega o script do Socket.IO e inicia o chat
    const socketIoScript = document.createElement('script');
    socketIoScript.src = `${SERVER_URL}/socket.io/socket.io.js`;
    document.head.appendChild(socketIoScript);

    socketIoScript.onload = () => {
        const socket = io(SERVER_URL);
        // --- TODO O SEU CÓDIGO JAVASCRIPT VEM AQUI ---
        // (Copiei e colei o código da versão anterior, fazendo pequenos ajustes)
        let currentUser = null; 
        let isSoundMuted = false;
        let friends = [];
        let openPrivateChats = {};
        
        const chatIcon = document.getElementById('chat-icon');
        const chatWindow = document.getElementById('chat-window');
        const mainChatBody = document.getElementById('main-chat-body');
        const mainChatFooter = document.getElementById('main-chat-footer');
        const privateChatsContainer = document.getElementById('private-chats-container');
        const loginScreen = document.querySelector('.login-screen');
        const chatScreen = document.querySelector('.chat-screen');
        const soundToggleBtn = document.getElementById('sound-toggle-btn');
        const loginBtn = document.getElementById('login-btn');
        const myUsernameDisplay = document.getElementById('my-username');
        const privateChatBtn = document.getElementById('private-chat-btn');
        const privateUserListModal = document.getElementById('private-user-list-modal');
        const logoutBtn = document.getElementById('logout-btn');

        const playSound = (soundId) => { 
            const soundElement = document.getElementById(soundId);
            if (!isSoundMuted && soundElement) { 
                soundElement.currentTime = 0; 
                soundElement.play().catch(e => {}); 
            } 
        };
        const showScreen = (screenToShow) => {
            chatWindow.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            screenToShow.classList.add('active');
        };
        
        function addMessageToChat(chatBody, data) {
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble';
            messageBubble.innerHTML = `<strong>${data.user}:</strong> ${data.text}`;
            chatBody.appendChild(messageBubble);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function addSystemMessage(chatBody, text) {
            const systemMessage = document.createElement('div');
            systemMessage.className = 'system-message';
            systemMessage.textContent = text;
            chatBody.appendChild(systemMessage);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function initializeChatFooter(footerContainer, isPrivate = false, recipient = null) {
            footerContainer.innerHTML = `<input type="text" class="message-input" placeholder="Digite sua mensagem...">`;
            const messageInput = footerContainer.querySelector('.message-input');
            const sendMessage = () => {
                const messageText = messageInput.value.trim();
                if (messageText === '') return;
                if (isPrivate) {
                    socket.emit('send_private_message', { text: messageText, to: recipient, from: currentUser });
                } else {
                    socket.emit('send_message', { text: messageText, user: currentUser });
                }
                messageInput.value = '';
            };
            messageInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
        }

        function createOrFocusPrivateChat(username) {
            if (openPrivateChats[username]) { return; }
            const windowEl = document.createElement('div');
            windowEl.className = 'private-chat-window';
            windowEl.innerHTML = `
                <div class="private-chat-header">
                    <span>Chat com ${username}</span>
                    <div class="private-chat-header-buttons">
                        <button class="private-nudge-btn" title="Puxão">👋</button>
                        <button class="private-chat-close-btn" title="Fechar">&times;</button>
                    </div>
                </div>
                <div class="chat-body private-chat-messages"></div>
                <div class="chat-footer"></div>`;
            privateChatsContainer.appendChild(windowEl);
            initializeChatFooter(windowEl.querySelector('.chat-footer'), true, username);
            openPrivateChats[username] = { windowEl };
            windowEl.querySelector('.private-nudge-btn').onclick = () => socket.emit('send_nudge', { to: username, from: currentUser });
            windowEl.querySelector('.private-chat-close-btn').onclick = () => { windowEl.remove(); delete openPrivateChats[username]; };
        }

        socket.on('message_received', (data) => {
            addMessageToChat(mainChatBody, data);
            playSound('notification-sound');
        });
        socket.on('private_message_received', (data) => {
            const partner = data.from === currentUser ? data.to : data.from;
            if (!openPrivateChats[partner]) { createOrFocusPrivateChat(partner); }
            const chatWindow = openPrivateChats[partner].windowEl;
            addMessageToChat(chatWindow.querySelector('.chat-body'), { user: data.from, text: data.text });
            playSound('notification-sound');
        });
        socket.on('system_message', (text) => addSystemMessage(mainChatBody, text));
        socket.on('update_user_list', (userList) => friends = userList);
        socket.on('nudge_received', (data) => {
            if(openPrivateChats[data.from]){
                const chatWindow = openPrivateChats[data.from].windowEl;
                chatWindow.classList.add('shake');
                setTimeout(() => chatWindow.classList.remove('shake'), 820);
                playSound('nudge-sound');
            }
        });

        chatIcon.addEventListener('click', () => chatWindow.classList.toggle('show'));
        soundToggleBtn.addEventListener('click', () => { isSoundMuted = !isSoundMuted; soundToggleBtn.innerHTML = isSoundMuted ? '🔇' : '🔔'; });
        loginBtn.addEventListener('click', () => {
            const usernameInput = document.getElementById('login-username');
            const username = usernameInput.value.trim();
            if (username) { 
                currentUser = username; 
                myUsernameDisplay.textContent = currentUser; 
                socket.emit('user_joined', currentUser);
                showScreen(chatScreen); 
                usernameInput.value = '';
            }
        });
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.reload(); });
        privateChatBtn.addEventListener('click', () => {
            privateUserListModal.style.display = 'block';
            const userList = privateUserListModal.querySelector('ul');
            userList.innerHTML = '';
            friends.forEach(user => {
                if (user !== currentUser) {
                    const li = document.createElement('li');
                    li.textContent = user;
                    li.onclick = () => { createOrFocusPrivateChat(user); privateUserListModal.style.display = 'none'; };
                    userList.appendChild(li);
                }
            });
        });
        document.addEventListener('click', (e) => {
            if (!privateUserListModal.contains(e.target) && !privateChatBtn.contains(e.target)) {
                privateUserListModal.style.display = 'none';
            }
        });
        initializeChatFooter(mainChatFooter);
    };
})();
