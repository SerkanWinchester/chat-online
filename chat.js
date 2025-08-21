const socket = io('https://meu-chat-lin7.onrender.com');

let currentUser = null;
let neonActive = false;
let userSettings = {};

// UI
function toggleChat() {
  const chat = document.getElementById('chatContainer');
  if (!currentUser) {
    document.getElementById('loginPopup').style.display = 'block';
  } else chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex';
}
function minimizeChat(){ document.getElementById('chatContainer').style.display='none'; }
function closePopup(id){ document.getElementById(id).style.display='none'; }
function toggleFriendsPanel(){ document.getElementById('friendsPanel').classList.toggle('active'); }
function toggleEmojiPanel(){ 
  const panel=document.getElementById('emojiPanel');
  panel.style.display = panel.style.display==='block'?'none':'block';
}
function toggleSettings(){ 
  const panel=document.getElementById('settingsPanel');
  panel.style.display = panel.style.display==='block'?'none':'block';
}

// Login
function login(){
  const username = document.getElementById('usernameInput').value;
  if(!username){ alert('Digite um nome'); return; }
  currentUser = username;
  document.getElementById('loginPopup').style.display='none';
  document.getElementById('chatContainer').style.display='flex';
  socket.emit('login',{ username });
}

// Logout
function logout(){ currentUser=null; document.getElementById('chatContainer').style.display='none'; document.getElementById('loginPopup').style.display='block'; }

// Mensagens
function sendMessage(){
  const input = document.getElementById('chatInput');
  if(!input.value.trim()) return;
  const msg = {username:currentUser,message:input.value,settings:userSettings};
  socket.emit('chat message', msg);
  input.value='';
}
function scrollToBottom(){
  const el = document.getElementById('chatMessages');
  if(el) el.scrollTop = el.scrollHeight;
}

// Papéis de parede
function setBgImage(url){ document.getElementById('chatContainer').style.backgroundImage=`url('${url}')`; document.getElementById('chatContainer').style.backgroundColor='transparent'; userSettings.bg=url; }
function setBgColor(color){ document.getElementById('chatContainer').style.backgroundColor=color; document.getElementById('chatContainer').style.backgroundImage='none'; userSettings.bg=color; }

// Status
function setStatus(status){ userSettings.status=status; socket.emit('user status update',{status}); }

// Inicialização
document.addEventListener('DOMContentLoaded',()=>{
  const fonts = ['Roboto','Press Start 2P','Pacifico','Montserrat','Oswald','Raleway'];
  const select=document.getElementById('fontSelect');
  fonts.forEach(f=>{ const o=document.createElement('option'); o.value=f; o.textContent=f; select.appendChild(o); });
  select.addEventListener('change',(e)=>{ userSettings.font=e.target.value; document.getElementById('chatMessages').style.fontFamily=e.target.value; document.getElementById('chatInput').style.fontFamily=e.target.value; });
  document.getElementById('neonToggle').addEventListener('change',(e)=> neonActive=e.target.checked);
  document.getElementById('neonColor').addEventListener('change',(e)=> userSettings.neonColor=e.target.value);
});

// Socket.io
socket.on('chat message', (msg)=>{
  const chatMessages=document.getElementById('chatMessages');
  const div=document.createElement('div');
  const userFont = msg.settings && msg.settings.font?msg.settings.font:'Roboto';
  const msgContent = msg.settings && msg.settings.neonActive ? 
      `<span style="color:${msg.settings.neonColor}" class="neonBlink">${msg.message}</span>` : msg.message;
  div.innerHTML=`<b style="font-family:${userFont}">${msg.username}:</b> <span style="font-family:${userFont}">${msgContent}</span>`;
  chatMessages.appendChild(div);
  scrollToBottom();
});

socket.on('user list update', users=>{
  const list=document.getElementById('friendsList');
  list.innerHTML='';
  Object.values(users).forEach(u=>{
    if(u.name!==currentUser){
      const li=document.createElement('li');
      li.className='friend '+u.status;
      li.innerHTML=`<span onclick="alert('Chat privado não implementado')">${u.name} (${u.status})</span>`;
      list.appendChild(li);
    }
  });
});
