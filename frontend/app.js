// ============================================
//   SERENITY - Frontend Application Logic
// ============================================

const API_BASE = 'http://localhost:5000/api';

let token = localStorage.getItem('serenity_token') || '';
let currentUser = JSON.parse(localStorage.getItem('serenity_user') || 'null');
let currentSessionId = null;
let currentMood = null;
let isLoading = false;
let sessions = [];

// ── Bootstrap ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showApp();
  } else {
    showAuth();
  }
});

// ── Auth helpers ──────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser?.name || 'User';
  document.getElementById('user-avatar').textContent =
    (currentUser?.name || 'U')[0].toUpperCase();
  loadHistory();
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
  });
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  clearErrors();
}

function clearErrors() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-error-signup').textContent = '';
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('auth-error');

  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  try {
    const res  = await apiFetch('/auth/login', 'POST', { email, password }, false);
    token      = res.token;
    currentUser = res.user;
    localStorage.setItem('serenity_token', token);
    localStorage.setItem('serenity_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Login failed.';
  }
}

async function handleSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('auth-error-signup');

  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }

  try {
    const res  = await apiFetch('/auth/signup', 'POST', { name, email, password }, false);
    token      = res.token;
    currentUser = res.user;
    localStorage.setItem('serenity_token', token);
    localStorage.setItem('serenity_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Signup failed.';
  }
}

function handleLogout() {
  token = '';
  currentUser = null;
  currentSessionId = null;
  sessions = [];
  localStorage.removeItem('serenity_token');
  localStorage.removeItem('serenity_user');
  showAuth();
}

// ── API helper ────────────────────────────────
async function apiFetch(path, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + path, opts);
  const data = await res.json();

  if (!res.ok) {
    // Handle first validation error if array
    const msg = data.errors?.[0]?.msg || data.error || 'Something went wrong.';
    throw new Error(msg);
  }
  return data;
}

// ── Chat sessions ─────────────────────────────
async function loadHistory() {
  try {
    const data = await apiFetch('/history');
    sessions = data.sessions || [];
    renderChatList();
    if (sessions.length > 0) {
      loadSession(sessions[0]._id);
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

function renderChatList() {
  const cl = document.getElementById('chat-list');
  if (sessions.length === 0) {
    cl.innerHTML = '<div class="empty-history">No conversations yet</div>';
    return;
  }
  cl.innerHTML = sessions.map(s => `
    <div class="chat-item${s._id === currentSessionId ? ' active' : ''}"
         onclick="loadSession('${s._id}')" data-id="${s._id}">
      ${escHtml(s.title || 'Conversation')}
    </div>`).join('');
}

async function loadSession(id) {
  currentSessionId = id;
  renderChatList();
  try {
    const data = await apiFetch(`/history/${id}`);
    renderAllMessages(data.session.messages);
  } catch (err) {
    console.error('Session load error:', err);
  }
}

async function createNewSession() {
  try {
    const data = await apiFetch('/chat/session', 'POST', { mood: currentMood });
    currentSessionId = data.session._id;
    sessions.unshift(data.session);
    renderChatList();
    // Show welcome screen
    document.getElementById('chat-area').innerHTML =
      `<div class="welcome" id="welcome">
        <div class="welcome-icon">🌿</div>
        <h2>New Conversation</h2>
        <p>What's on your mind today?</p>
        <div class="quick-btns">
          <button class="quick-btn" onclick="quickMsg('I\'m feeling stressed')">I\'m feeling stressed</button>
          <button class="quick-btn" onclick="quickMsg('I need a breathing exercise')">Breathing exercise</button>
          <button class="quick-btn" onclick="quickMsg('Give me positive affirmations')">Affirmations</button>
        </div>
      </div>`;
  } catch (err) {
    alert('Could not create session: ' + err.message);
  }
}

// ── Message rendering ─────────────────────────
function renderAllMessages(messages) {
  const ca = document.getElementById('chat-area');
  ca.innerHTML = '';
  messages.forEach(m => appendBubble(m.role, m.content, m.timestamp));
  ca.scrollTop = ca.scrollHeight;
}

function appendBubble(role, content, timestamp, scroll = true) {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  const ca   = document.getElementById('chat-area');
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `msg-row ${isUser ? 'user' : 'bot'}`;
  row.innerHTML = `
    <div class="msg-avatar ${isUser ? 'user' : 'bot'}">${isUser ? 'U' : 'S'}</div>
    <div class="msg-wrap">
      <div class="msg-bubble ${isUser ? 'user' : 'bot'}">${formatContent(content)}</div>
      <div class="msg-time">${time}</div>
    </div>`;
  ca.appendChild(row);
  if (scroll) ca.scrollTop = ca.scrollHeight;
}

function formatContent(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showTyping() {
  const ca = document.getElementById('chat-area');
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.id = 'typing-indicator';
  row.innerHTML = `
    <div class="msg-avatar bot">S</div>
    <div class="typing-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  ca.appendChild(row);
  ca.scrollTop = ca.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

// ── Send message ──────────────────────────────
async function sendMessage() {
  if (isLoading) return;
  const inp  = document.getElementById('msg-input');
  const text = inp.value.trim();
  if (!text) return;

  if (!currentSessionId) {
    await createNewSession();
  }

  inp.value = '';
  inp.style.height = 'auto';

  appendBubble('user', text);
  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();

  try {
    const data = await apiFetch(`/chat/${currentSessionId}`, 'POST', {
      message: text,
      mood: currentMood
    });
    removeTyping();
    appendBubble('assistant', data.reply);

    // Update session title in sidebar
    const s = sessions.find(x => x._id === currentSessionId);
    if (s && s.title === 'New Conversation') {
      s.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
      renderChatList();
    }
  } catch (err) {
    removeTyping();
    appendBubble('assistant',
      `I'm having a moment of pause. ${err.message} Please try again.`);
  }

  isLoading = false;
  document.getElementById('send-btn').disabled = false;
}

function quickMsg(text) {
  document.getElementById('msg-input').value = text;
  sendMessage();
}

// ── Mood selector ─────────────────────────────
function setMood(btn, mood) {
  currentMood = mood;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const labels = {
    great: 'Feeling great! 😊',
    okay: 'Doing okay 😐',
    stressed: 'Feeling stressed 😔',
    overwhelmed: 'Feeling overwhelmed 😣'
  };
  document.getElementById('mood-label').textContent = labels[mood] || '';

  const msgs = {
    great: "I'm feeling pretty good today, just wanted to check in!",
    okay: "I'm doing okay, nothing major but wanted to chat.",
    stressed: "I'm feeling stressed and could really use some support.",
    overwhelmed: "I'm feeling really overwhelmed and anxious right now."
  };
  if (msgs[mood]) quickMsg(msgs[mood]);
}

// ── Quick actions ─────────────────────────────
function quickAction(type) {
  const msgs = {
    breathing: "Can you guide me through a calming breathing exercise right now?",
    quote: "Share a calming and motivational quote to help me feel better."
  };
  if (msgs[type]) quickMsg(msgs[type]);
}

// ── Export chat ───────────────────────────────
async function exportChat() {
  if (!currentSessionId) { alert('No conversation to export.'); return; }
  try {
    const data = await apiFetch(`/history/${currentSessionId}`);
    const msgs = data.session.messages;
    if (!msgs.length) { alert('No messages to export.'); return; }

    const lines = msgs.map(m => {
      const who  = m.role === 'user' ? 'You' : 'Serenity';
      const time = new Date(m.timestamp).toLocaleString();
      return `[${time}] ${who}:\n${m.content}\n`;
    });

    const blob = new Blob(
      [`Serenity — Chat Export\n${data.session.title}\n${'='.repeat(50)}\n\n${lines.join('\n')}`],
      { type: 'text/plain' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `serenity-${Date.now()}.txt`;
    a.click();
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
}

// ── Textarea helpers ──────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
