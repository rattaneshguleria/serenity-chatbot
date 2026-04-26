# 🌿 Serenity — Stress Management Chatbot

> **Your Calm Companion in a Chaotic World**

A full-stack AI-powered stress management chatbot with real user authentication, persistent chat history, and emotionally aware responses.

---

## 🗂️ Project Structure

```
serenity/
├── backend/                    ← Node.js + Express API server
│   ├── server.js               ← Main entry point
│   ├── package.json
│   ├── .env.example            ← Copy to .env and fill in keys
│   ├── models/
│   │   ├── User.js             ← User schema (bcrypt hashed passwords)
│   │   └── Chat.js             ← Chat session + messages schema
│   ├── routes/
│   │   ├── auth.js             ← POST /api/auth/signup, /login, /me
│   │   ├── chat.js             ← POST /api/chat/:id (send message)
│   │   └── history.js          ← GET /api/history (past sessions)
│   └── middleware/
│       └── auth.js             ← JWT verification middleware
│
└── frontend/                   ← Vanilla HTML/CSS/JS frontend
    ├── index.html              ← Main HTML
    ├── style.css               ← Dark theme stylesheet
    ├── app.js                  ← All frontend logic
    └── package.json
```

---

## ⚙️ API Keys You Need

| Service | What For | Get It From |
|---------|----------|-------------|
| **Google API** | AI chat responses | https://ai.google.dev/gemini-api/docs/api-key → API Keys |
| **MongoDB Atlas** | Store users & chats | https://cloud.mongodb.com (free tier) |

---

## 🚀 Step-by-Step Setup

### Step 1 — Install Node.js

Download and install Node.js (v18 or higher) from:
👉 https://nodejs.org

Verify installation:
```bash
node --version    # Should print v18.x.x or higher
npm --version     # Should print 9.x.x or higher
```

---

### Step 2 — Set Up MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com and sign up for free
2. Click **"Build a Database"** → Choose **Free Shared** tier
3. Choose a cloud provider (AWS/Google) and region → Click **Create**
4. Under **Security → Database Access**: create a DB user with a password
5. Under **Security → Network Access**: click **"Add IP Address"** → **"Allow Access From Anywhere"** (0.0.0.0/0)
6. Click **Connect** → **Connect your application** → Copy the connection string

   It looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your actual DB user password
8. Add `/serenity` before the `?` to specify database name:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/serenity?retryWrites=true&w=majority
   ```

---

### Step 3 — Get Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikey  
2. Sign up / log in with your Google account  
3. Click **Create API Key**  
4. Copy the key (starts with `AIza...`)  
5. ⚠️ Never share this key publicly!

---

### Step 4 — Set Up Backend

```bash
# Navigate to backend folder
cd serenity/backend

# Install all dependencies
npm install

# Copy the example env file
cp .env.example .env
```

Now open `.env` in any text editor (Notepad, VS Code, etc.) and fill in:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/serenity?retryWrites=true&w=majority

JWT_SECRET=pick_any_long_random_string_like_this_serenity2024secretkey

JWT_EXPIRES_IN=7d

ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

FRONTEND_URL=http://localhost:3000
```

---

### Step 5 — Run the Backend

```bash
# From the backend/ folder
npm run dev
```

You should see:
```
🌿 Serenity server running on http://localhost:5000
✅ MongoDB connected
```

Test it's working:
```
http://localhost:5000/api/health
```
Should return: `{"status":"ok","app":"Serenity","version":"1.0.0"}`

---

### Step 6 — Run the Frontend

Open a **new terminal** (keep backend running):

```bash
# Navigate to frontend folder
cd serenity/frontend

# Install serve (simple static server)
npm install

# Start frontend
npm start
```

Or simply open `index.html` directly in your browser (double-click the file).

---

### Step 7 — Use Serenity

1. Open your browser → go to `http://localhost:3000`
2. Click **Sign Up** and create an account
3. Log in and start chatting!

---

## 🔌 API Endpoints Reference

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Create account |
| POST | `/api/auth/login` | `{ email, password }` | Login, get JWT token |
| GET | `/api/auth/me` | — (token in header) | Get current user |

### Chat

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/session` | `{ mood? }` | Create new chat session |
| POST | `/api/chat/:sessionId` | `{ message, mood? }` | Send message, get reply |
| DELETE | `/api/chat/:sessionId` | — | Delete a session |

### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get all sessions (titles) |
| GET | `/api/history/:id` | Get full messages for a session |

**All chat/history routes require:**
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Security Features

- ✅ Passwords hashed with **bcrypt** (12 salt rounds)
- ✅ **JWT** tokens for stateless auth (7-day expiry)
- ✅ **Rate limiting** — 100 requests per 15 minutes per IP
- ✅ Input validation on all auth routes
- ✅ Users can only access their own chat sessions
- ✅ API keys stored in `.env` (never in code)

---

## 🛠️ Troubleshooting

**"MongoDB connection failed"**
- Check your connection string in `.env`
- Make sure you allowed 0.0.0.0/0 in Network Access
- Make sure your DB user password has no special characters

**"Invalid token" errors**
- Your JWT_SECRET may have changed — log out and log in again

**"401 Unauthorized" from Anthropic**
- Double-check your ANTHROPIC_API_KEY in `.env`
- Make sure there are no extra spaces or quotes

**Frontend can't reach backend**
- Make sure backend is running on port 5000
- Check FRONTEND_URL in .env matches where you serve frontend

---

## 🎓 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| AI | Anthropic Claude API |
| Validation | express-validator |
| Security | express-rate-limit, CORS |

---

*Serenity — Built with care for your mental wellbeing 🌿*
