// public/client.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Conexão com o Servidor
    const socket = io();

    // --- ESTADO GLOBAL DO CLIENTE ---
    let currentUser = null; 
    let isSoundMuted = false;
    let friends = [];
    let openPrivateChats = {};
    let chatSettings = {
        bgColor: '', fontSize: '14px',
        messageStyles: { bubbleBgColor: '#FFFFFF', bubbleOpacity: 85, textColor: '#000000' }
    };

    const reactions = [
        { id: 'like', emoji: '👍', soundId: 'like-sound' }, { id: 'laugh', emoji: '😂', soundId: 'laugh-sound' },
        { id: 'love', emoji: '❤️', soundId: 'love-sound' }, { id: 'angry', emoji: '😠', soundId: 'angry-sound' },
        { id: 'clap', emoji: '👏', soundId: 'clap-sound' }, { id: 'sad', emoji: '😢', soundId: 'sad-sound' },
        { id: 'wow', emoji: '😮', soundId: 'wow-sound' }, { id: 'thinking', emoji: '🤔', soundId: 'thinking-sound' },
    ];

    // --- REFERÊNCIAS AO DOM ---
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const mainChatBody = document.getElementById('main-chat-body');
    const mainChatFooter = document.getElementById('main-chat-footer');
    const privateChatsContainer = document.getElementById('private-chats-container');
    const loginScreen = document.querySelector('.login-screen');
    const chatScreen = document.querySelector('.chat-screen');
    const settingsScreen = document.querySelector('.settings-screen');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    const loginBtn = document.getElementById('login-btn');
    const myUsernameDisplay = document.getElementById('my-username');
    const privateChatBtn = document.getElementById('private-chat-btn');
    const privateUserListModal = document.getElementById('private-user-list-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // --- FUNÇÕES AUXILIARES ---
    const playSound = (soundElement) => { 
        if (!isSoundMuted && soundElement) { 
            soundElement.currentTime = 0; 
            soundElement.play().catch(e => console.error("Erro ao tocar som:", e)); 
        } 
    };
    const showScreen = (screenToShow) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screenToShow.classList.add('active');
    };
    
    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    function addMessageToChat(chatBody, data) {
        const messageId = data.id || `msg-${Date.now()}`; // Garante um ID
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        messageBubble.id = messageId;
        messageBubble.innerHTML = `<strong>${data.user}:</strong> ${data.text}`;
        
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'reaction-buttons';
        const countersContainer = document.createElement('div');
        countersContainer.className = 'reaction-counters';
        messageBubble.appendChild(countersContainer);

        reactions.forEach(reaction => {
            const btn = document.createElement('button');
            btn.innerHTML = reaction.emoji;
            btn.title = reaction.id;
            btn.onclick = (e) => {
                e.stopPropagation();
                // Envia a reação para o servidor
                socket.emit('send_reaction', { messageId: messageId, reactionId: reaction.id });
            };
            reactionsContainer.appendChild(btn);
        });
        messageBubble.appendChild(reactionsContainer);
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

    function updateReactionCount(messageId, reactionId) {
        const messageBubble = document.getElementById(messageId);
        if (!messageBubble) return;

        playSound(document.getElementById(reactions.find(r => r.id === reactionId).soundId));

        let counts = JSON.parse(messageBubble.dataset.reactions || '{}');
        counts[reactionId] = (counts[reactionId] || 0) + 1;
        messageBubble.dataset.reactions = JSON.stringify(counts);
        
        const countersContainer = messageBubble.querySelector('.reaction-counters');
        if (!countersContainer) return;
        countersContainer.innerHTML = ''; 

        for (const id in counts) {
            if (counts[id] > 0) {
                const reactionData = reactions.find(r => r.id === id);
                if (reactionData) {
                    const counterSpan = document.createElement('span');
                    counterSpan.innerHTML = `${reactionData.emoji} ${counts[id]}`;
                    countersContainer.appendChild(counterSpan);
                }
            }
        }
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
        if (openPrivateChats[username]) {
            openPrivateChats[username].windowEl.classList.remove('minimized');
            return;
        }

        const windowEl = document.createElement('div');
        windowEl.className = 'private-chat-window';
        windowEl.dataset.user = username;
        windowEl.innerHTML = `
            <div class="private-chat-header"><span>Chat com ${username}</span><div class="private-chat-header-buttons">
                <button class="private-call-btn" title="Ligar (recurso visual)">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24c1.12.37 2.33.57 3.57.57c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1c-9.39 0-17-7.61-17-17c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02l-2.2 2.2z"/></path></svg>
                </button>
                <button class="private-nudge-btn" title="Puxão">Puxão</button>
                <button class="private-minimize-btn" title="Minimizar"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19,13H5V11H19V13Z" /></svg></button>
                <button class="private-chat-close-btn" title="Fechar">&times;</button>
            </div></div>
            <div class="chat-body private-chat-messages"></div>
            <div class="chat-footer"></div>`;
        
        privateChatsContainer.appendChild(windowEl);
        initializeChatFooter(windowEl.querySelector('.chat-footer'), true, username);

        const chatState = { windowEl, isMinimized: false };
        openPrivateChats[username] = chatState;
        
        windowEl.querySelector('.private-call-btn').onclick = () => alert("Função de chamada ainda não implementada. Requer um servidor complexo.");
        windowEl.querySelector('.private-nudge-btn').onclick = () => socket.emit('send_nudge', { to: username, from: currentUser });
        windowEl.querySelector('.private-minimize-btn').onclick = () => { windowEl.classList.add('minimized'); chatState.isMinimized = true; };
        windowEl.querySelector('.private-chat-close-btn').onclick = () => { windowEl.remove(); delete openPrivateChats[username]; };
        windowEl.querySelector('.private-chat-header').onclick = () => { if (chatState.isMinimized) { windowEl.classList.remove('minimized'); chatState.isMinimized = false; }};
    }

    // --- EVENT LISTENERS DO SOCKET.IO (Recebendo do Servidor) ---
    socket.on('message_received', (data) => {
        addMessageToChat(mainChatBody, data);
        playSound(document.getElementById('notification-sound'));
    });

    socket.on('private_message_received', (data) => {
        const partner = data.from === currentUser ? data.to : data.from;
        if (!openPrivateChats[partner]) {
            createOrFocusPrivateChat(partner);
        }
        const chatWindow = openPrivateChats[partner].windowEl;
        const chatBody = chatWindow.querySelector('.chat-body');
        addMessageToChat(chatBody, { user: data.from, text: data.text });
        playSound(document.getElementById('notification-sound'));
    });

    socket.on('system_message', (text) => {
        addSystemMessage(mainChatBody, text);
    });

    socket.on('update_user_list', (userList) => {
        friends = userList;
    });

    socket.on('reaction_received', (data) => {
        updateReactionCount(data.messageId, data.reactionId);
    });
    
    socket.on('nudge_received', (data) => {
        if(openPrivateChats[data.from]){
            const chatWindow = openPrivateChats[data.from].windowEl;
            chatWindow.classList.add('shake');
            setTimeout(() => chatWindow.classList.remove('shake'), 820);
            playSound(document.getElementById('nudge-sound'));
        }
    });

    // --- EVENT LISTENERS DA PÁGINA ---
    chatIcon.addEventListener('click', () => chatWindow.classList.toggle('show'));
    soundToggleBtn.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        soundToggleBtn.innerHTML = isSoundMuted ? '🔇' : '🔔';
    });
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
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // A desconexão será tratada pelo evento 'disconnect' no servidor
        window.location.reload(); 
    });
    settingsBtn.addEventListener('click', () => showScreen(settingsScreen));
    backToChatBtn.addEventListener('click', () => showScreen(chatScreen));
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

    // --- INICIALIZAÇÃO ---
    initializeChatFooter(mainChatFooter);
});
