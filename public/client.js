document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentUser = null;

    // Elementos do DOM
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    const loginScreen = document.querySelector('.login-screen');
    const chatScreen = document.querySelector('.chat-screen');
    const loginBtn = document.getElementById('login-btn');
    const loginUsernameInput = document.getElementById('login-username');
    const mainChatBody = document.getElementById('main-chat-body');
    const messageInput = document.querySelector('.message-input');
    const logoutBtn = document.getElementById('logout-btn');
    const usersBtn = document.getElementById('users-btn');
    const usersListPanel = document.getElementById('users-list');
    const notificationSound = document.getElementById('notification-sound');

    // Funções
    const showScreen = (screen) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    };

    const addMessage = (data) => {
        const { user, text } = data;
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        if (user === 'Sistema') {
            messageBubble.classList.add('system-message');
            messageBubble.textContent = text;
        } else {
            messageBubble.innerHTML = `<strong>${user}</strong><span>${text}</span>`;
            if (user === currentUser) {
                messageBubble.classList.add('my-message');
            } else {
                messageBubble.classList.add('other-message');
                notificationSound.play().catch(e => {});
            }
        }
        mainChatBody.appendChild(messageBubble);
        mainChatBody.scrollTop = mainChatBody.scrollHeight;
    };

    const updateUsersList = (users) => {
        const list = usersListPanel.querySelector('ul');
        list.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            if (user === currentUser) {
                li.textContent += ' (Você)';
            }
            list.appendChild(li);
        });
    };

    // Eventos
    chatIcon.addEventListener('click', () => chatWindow.classList.toggle('show'));

    loginBtn.addEventListener('click', () => {
        const username = loginUsernameInput.value.trim();
        if (username) {
            currentUser = username;
            socket.emit('join', currentUser);
            showScreen(chatScreen);
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && messageInput.value.trim()) {
            socket.emit('sendMessage', { user: currentUser, text: messageInput.value });
            messageInput.value = '';
        }
    });

    usersBtn.addEventListener('click', () => usersListPanel.classList.toggle('show'));
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.reload();
    });

    // Eventos do Servidor
    socket.on('message', addMessage);
    socket.on('updateUsers', updateUsersList);
});
