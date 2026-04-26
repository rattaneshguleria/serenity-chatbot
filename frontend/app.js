// ============================================
//   SERENITY - Enhanced Frontend App
//   Features: Particles, Typewriter, Breathing
//   Mood themes, Daily tips, Mood history
// ============================================

const API_BASE = 'https://serenity-chatbot-5n1z.onrender.com/api';

let token = localStorage.getItem('serenity_token') || '';
let currentUser = JSON.parse(localStorage.getItem('serenity_user') || 'null');
let currentSessionId = null;
let currentMood = null;
let isLoading = false;
let sessions = [];
let ambientPlaying = false;
let breathingInterval = null;
let moodHistory = JSON.parse(localStorage.getItem('serenity_mood_history') || '[]');

// Daily tips rotation
const DAILY_TIPS = [
  "Take 3 deep breaths before responding to stressful messages.",
  "A 5-minute walk can reduce cortisol levels significantly.",
  "Name your emotion out loud — it reduces its intensity.",
  "Drink a glass of water. Dehydration worsens anxiety.",
  "The 5-4-3-2-1 method: name 5 things you can see right now.",
  "Your thoughts are not facts. You can observe them without believing them.",
  "Rest is productive. Giving yourself a break is an act of strength.",
  "Progress, not perfection. One small step is enough today.",
  "Tension lives in the body. Drop your shoulders. Unclench your jaw.",
  "You've survived every hard day so far. Today is no different.",
  "It's okay to say no. Boundaries are self-care.",
  "Gratitude rewires the brain. Name one good thing from today.",
];

const MOOD_COLORS = {
  great: '#4ade80',
  okay: '#38bdf8',
  stressed: '#f59e0b',
  overwhelmed: '#f87171'
};

const MOOD_HEIGHTS = { great: 90, okay: 60, stressed: 40, overwhelmed: 20 };

// ── Particle System ───────────────────────────
function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const count = 55;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? '45,212,191' : '56,189,248'
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });

    // Draw soft connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(45,212,191,${0.06 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ── Daily Tip ─────────────────────────────────
function setDailyTip() {
  const dayIndex = new Date().getDate() % DAILY_TIPS.length;
  const el = document.getElementById('tip-text');
  if (el) el.textContent = DAILY_TIPS[dayIndex];
}

// ── Auth ──────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser?.name || 'User';
  document.getElementById('user-avatar').textContent = (currentUser?.name || 'U')[0].toUpperCase();

  // Personalized welcome
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const wt = document.getElementById('welcome-title');
  if (wt) wt.textContent = `${greeting}, ${currentUser?.name?.split(' ')[0] || 'friend'} 🌿`;

  setDailyTip();
  loadHistory();
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  const slider = document.getElementById('tab-slider');
  slider.classList.toggle('right', tab === 'signup');
  clearErrors();
}

function clearErrors() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-error-signup').textContent = '';
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  if (!email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  try {
    const res = await apiFetch('/auth/login', 'POST', { email, password }, false);
    token = res.token;
    currentUser = res.user;
    localStorage.setItem('serenity_token', token);
    localStorage.setItem('serenity_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Login failed.';
  }
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('auth-error-signup');
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  try {
    const res = await apiFetch('/auth/signup', 'POST', { name, email, password }, false);
    token = res.token;
    currentUser = res.user;
    localStorage.setItem('serenity_token', token);
    localStorage.setItem('serenity_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Signup failed.';
  }
}

function handleLogout() {
  token = ''; currentUser = null; currentSessionId = null; sessions = [];
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
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) {
    const msg = data.errors?.[0]?.msg || data.error || 'Something went wrong.';
    throw new Error(msg);
  }
  return data;
}

// ── Sessions ──────────────────────────────────
async function loadHistory() {
  try {
    const data = await apiFetch('/history');
    sessions = data.sessions || [];
    renderChatList();
    if (sessions.length > 0) loadSession(sessions[0]._id);
  } catch (err) { console.error('History error:', err); }
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
  } catch (err) { console.error('Session load error:', err); }
}

async function createNewSession() {
  try {
    const data = await apiFetch('/chat/session', 'POST', { mood: currentMood });
    currentSessionId = data.session._id;
    sessions.unshift(data.session);
    renderChatList();
    showWelcome();
  } catch (err) { alert('Could not create session: ' + err.message); }
}

function showWelcome() {
  const ca = document.getElementById('chat-area');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  ca.innerHTML = `<div class="welcome" id="welcome">
    <div class="welcome-animation">
      <div class="welcome-orb"></div>
      <div class="welcome-icon">🌿</div>
    </div>
    <h2 class="welcome-title">${greeting}, ${currentUser?.name?.split(' ')[0] || 'friend'} 🌿</h2>
    <p class="welcome-sub">What's on your mind? I'm here to listen, support, and help you find calm.</p>
    <div class="quick-btns">
      <button class="quick-btn" onclick="quickMsg('I\\'m feeling really stressed today')">😔 I'm feeling stressed</button>
      <button class="quick-btn" onclick="quickMsg('I need help with anxiety')">💭 Help with anxiety</button>
      <button class="quick-btn" onclick="quickMsg('Guide me through a breathing exercise')">🫁 Breathing exercise</button>
      <button class="quick-btn" onclick="quickMsg('I need mindfulness tips')">🧘 Mindfulness</button>
      <button class="quick-btn" onclick="quickMsg('Give me positive affirmations')">🌟 Affirmations</button>
      <button class="quick-btn" onclick="quickMsg('I\\'m overwhelmed at work')">💼 Work stress</button>
    </div>
  </div>`;
}

// ── Messages ──────────────────────────────────
function renderAllMessages(messages) {
  const ca = document.getElementById('chat-area');
  ca.innerHTML = '';
  messages.forEach(m => appendBubble(m.role, m.content, m.timestamp, false));
  ca.scrollTop = ca.scrollHeight;
}

function appendBubble(role, content, timestamp, scroll = true, typewrite = false) {
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();
  const ca = document.getElementById('chat-area');
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isUser = role === 'user';
  const row = document.createElement('div');
  row.className = `msg-row ${isUser ? 'user' : 'bot'}`;
  const bubbleId = 'bubble_' + Date.now();
  row.innerHTML = `
    <div class="msg-avatar ${isUser ? 'user' : 'bot'}">${isUser ? (currentUser?.name?.[0]?.toUpperCase() || 'U') : 'S'}</div>
    <div class="msg-wrap">
      <div class="msg-bubble ${isUser ? 'user' : 'bot'}" id="${bubbleId}"></div>
      <div class="msg-time">${time}</div>
    </div>`;
  ca.appendChild(row);
  const bubbleEl = document.getElementById(bubbleId);

  if (typewrite && !isUser) {
    typewriterEffect(bubbleEl, content, ca);
  } else {
    bubbleEl.innerHTML = formatContent(content);
  }

  if (scroll) setTimeout(() => { ca.scrollTop = ca.scrollHeight; }, 50);
}

// ── Typewriter Effect ─────────────────────────
function typewriterEffect(el, text, scrollContainer) {
  const formatted = formatContent(text);
  // Strip HTML for character-by-character, then re-add formatting
  const plain = text;
  let i = 0;
  el.innerHTML = '<span class="typewriter-cursor"></span>';

  const interval = setInterval(() => {
    if (i < plain.length) {
      el.innerHTML = formatContent(plain.slice(0, i + 1)) + '<span class="typewriter-cursor"></span>';
      i++;
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    } else {
      el.innerHTML = formatted;
      clearInterval(interval);
    }
  }, 18);
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
  const inp = document.getElementById('msg-input');
  const text = inp.value.trim();
  if (!text) return;
  if (!currentSessionId) await createNewSession();
  inp.value = '';
  inp.style.height = 'auto';
  appendBubble('user', text);
  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();
  try {
    const data = await apiFetch(`/chat/${currentSessionId}`, 'POST', { message: text, mood: currentMood });
    removeTyping();
    appendBubble('assistant', data.reply, null, true, true); // typewriter ON
    const s = sessions.find(x => x._id === currentSessionId);
    if (s && s.title === 'New Conversation') {
      s.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
      renderChatList();
    }
  } catch (err) {
    removeTyping();
    appendBubble('assistant', `I'm having a moment of pause. ${err.message} Please try again.`);
  }
  isLoading = false;
  document.getElementById('send-btn').disabled = false;
}

function quickMsg(text) {
  document.getElementById('msg-input').value = text;
  sendMessage();
}

// ── Mood ──────────────────────────────────────
function setMood(btn, mood) {
  currentMood = mood;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const labels = { great: 'Feeling great! 😊', okay: 'Doing okay 😐', stressed: 'Feeling stressed 😔', overwhelmed: 'Feeling overwhelmed 😣' };
  document.getElementById('mood-label').textContent = labels[mood] || '';

  // Apply mood theme to body
  document.body.className = `mood-${mood}`;

  // Save to mood history
  moodHistory.push({ mood, time: Date.now() });
  if (moodHistory.length > 7) moodHistory.shift();
  localStorage.setItem('serenity_mood_history', JSON.stringify(moodHistory));

  const msgs = {
    great: "I'm feeling pretty good today, just wanted to check in!",
    okay: "I'm doing okay, nothing major but wanted to chat.",
    stressed: "I'm feeling stressed and could really use some support.",
    overwhelmed: "I'm feeling really overwhelmed and anxious right now."
  };
  if (msgs[mood]) quickMsg(msgs[mood]);
}

// ── Mood History ──────────────────────────────
function showMoodHistory() {
  document.getElementById('mood-modal').style.display = 'flex';
  const chart = document.getElementById('mood-chart');
  const history = moodHistory.length > 0 ? moodHistory : [
    { mood: 'okay' }, { mood: 'stressed' }, { mood: 'stressed' },
    { mood: 'okay' }, { mood: 'great' }, { mood: 'okay' }, { mood: currentMood || 'okay' }
  ];
  chart.innerHTML = history.slice(-7).map((entry, i) => {
    const color = MOOD_COLORS[entry.mood] || '#38bdf8';
    const height = MOOD_HEIGHTS[entry.mood] || 50;
    const label = entry.mood || 'unknown';
    return `<div class="mood-bar" style="background:${color};height:${height}px;opacity:0.8" data-label="${label}" title="${label}"></div>`;
  }).join('');
}

// ── Breathing Exercise ────────────────────────
const breathPhases = [
  { name: 'Breathe In', duration: 4, class: 'inhale' },
  { name: 'Hold', duration: 4, class: 'hold' },
  { name: 'Breathe Out', duration: 4, class: 'exhale' },
  { name: 'Hold', duration: 4, class: 'hold' }
];

let breathPhaseIndex = 0;
let breathCount = 0;
let breathRunning = false;

function startBreathing() {
  if (breathRunning) return;
  breathRunning = true;
  document.getElementById('breath-start-btn').textContent = 'Running...';
  document.getElementById('breath-start-btn').disabled = true;
  runBreathPhase();
}

function runBreathPhase() {
  if (!breathRunning) return;
  const phase = breathPhases[breathPhaseIndex % breathPhases.length];
  const ring = document.getElementById('breathing-ring');
  const instruction = document.getElementById('breathing-instruction');
  const countEl = document.getElementById('breathing-count');

  ring.className = 'breathing-ring ' + phase.class;
  instruction.textContent = phase.name;
  countEl.textContent = phase.duration;

  let seconds = phase.duration;
  const timer = setInterval(() => {
    seconds--;
    countEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      breathPhaseIndex++;
      if (breathRunning) runBreathPhase();
    }
  }, 1000);
}

function closeBreathing() {
  breathRunning = false;
  breathPhaseIndex = 0;
  document.getElementById('breathing-modal').style.display = 'none';
  const ring = document.getElementById('breathing-ring');
  ring.className = 'breathing-ring';
  document.getElementById('breathing-instruction').textContent = 'Get comfortable and press Start';
  document.getElementById('breathing-count').textContent = '4';
  const btn = document.getElementById('breath-start-btn');
  btn.textContent = 'Start';
  btn.disabled = false;
}

// ── Daily Quote ───────────────────────────────
function getQuote() {
  const quotes = [
    '"The present moment is the only moment available to us." — Thich Nhat Hanh',
    '"You don\'t have to control your thoughts, you just have to stop letting them control you." — Dan Millman',
    '"Within you, there is a stillness and sanctuary." — Hermann Hesse',
    '"Take a deep breath. It\'s just a bad day, not a bad life."',
    '"You are braver than you believe, stronger than you seem." — A.A. Milne',
    '"Peace begins with a smile." — Mother Teresa',
    '"Almost everything will work again if you unplug it for a few minutes." — Anne Lamott',
    '"You can\'t calm the storm, so stop trying. Calm yourself, the storm will pass." — Timber Hawkeye',
  ];
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  if (!currentSessionId) createNewSession().then(() => appendBubble('assistant', `✨ **A thought for you:**\n\n*${q}*\n\nSit with that for a moment. 🌿`));
  else appendBubble('assistant', `✨ **A thought for you:**\n\n*${q}*\n\nSit with that for a moment. 🌿`);
}

// ── Ambient Sound ─────────────────────────────
function toggleAmbient() {
  const btn = document.getElementById('ambient-toggle');
  const audio = document.getElementById('ambient-audio');
  if (ambientPlaying) {
    audio.pause();
    ambientPlaying = false;
    btn.textContent = 'Off';
    btn.classList.remove('active');
  } else {
    // Use Web Audio API to generate soft rain sound
    playGeneratedAmbient();
    ambientPlaying = true;
    btn.textContent = 'On';
    btn.classList.add('active');
  }
}

let ambientCtx = null;
let ambientNodes = [];

function playGeneratedAmbient() {
  ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
  const bufferSize = 4096;
  const noiseNode = ambientCtx.createScriptProcessor(bufferSize, 1, 1);
  noiseNode.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.04;
    }
  };
  const filter = ambientCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gainNode = ambientCtx.createGain();
  gainNode.gain.value = 0.3;
  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ambientCtx.destination);
  ambientNodes = [noiseNode, filter, gainNode];
}

function stopGeneratedAmbient() {
  ambientNodes.forEach(n => { try { n.disconnect(); } catch(e) {} });
  if (ambientCtx) { ambientCtx.close(); ambientCtx = null; }
}

// ── Export ────────────────────────────────────
async function exportChat() {
  if (!currentSessionId) { alert('No conversation to export.'); return; }
  try {
    const data = await apiFetch(`/history/${currentSessionId}`);
    const msgs = data.session.messages;
    if (!msgs.length) { alert('No messages to export.'); return; }
    const lines = msgs.map(m => {
      const who = m.role === 'user' ? 'You' : 'Serenity';
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
  } catch (err) { alert('Export failed: ' + err.message); }
}

// ── Input helpers ─────────────────────────────
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

// ── Bootstrap ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  if (token && currentUser) {
    showApp();
  } else {
    showAuth();
  }
});