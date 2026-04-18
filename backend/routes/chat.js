// ============================================
//   SERENITY - Chat Routes
//   POST /api/chat/session        → Create new session
//   POST /api/chat/:sessionId     → Send message
//   DELETE /api/chat/:sessionId   → Delete session
// ============================================

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Serenity's personality system prompt
const SYSTEM_PROMPT = `You are Serenity, a warm, empathetic AI stress management companion. Your personality:
- Deeply caring, calm, and non-judgmental
- Use gentle, supportive language — never clinical or cold
- Remember the conversation context and reference it naturally
- When someone is stressed, first acknowledge their feelings before offering solutions
- Offer practical, evidence-based stress relief: breathing exercises (box breathing, 4-7-8), mindfulness, grounding techniques (5-4-3-2-1), progressive muscle relaxation, journaling prompts, CBT reframing
- Occasionally use calming metaphors (still water, gentle breeze, safe harbor)
- Keep responses concise but warm — avoid overwhelming the user
- If someone seems in crisis, gently suggest professional help (therapist, counselor, or crisis line)
- Format key exercises or tips with simple markdown when helpful
- End responses with a gentle, supportive closing or open question
- Your tagline: "Your calm companion in a chaotic world"`;

// ── POST /api/chat/session ───────────────────
router.post('/session', protect, async (req, res) => {
  try {
    const { mood } = req.body;
    const session = await Chat.create({
      userId: req.user._id,
      title: 'New Conversation',
      messages: [],
      mood: mood || null
    });
    res.status(201).json({ session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

// ── POST /api/chat/:sessionId ─────────────────
router.post('/:sessionId', protect, async (req, res) => {
  try {
    const { message, mood } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Find the session and verify ownership
    const session = await Chat.findOne({
      _id: req.params.sessionId,
      userId: req.user._id
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Add mood context to first message if provided
    const userContent = mood
      ? `[User mood: ${mood}] ${message.trim()}`
      : message.trim();

    // Add user message to session
    session.messages.push({ role: 'user', content: message.trim() });

    // Auto-title after first message
    if (session.messages.length === 1) {
      session.title = message.trim().slice(0, 50) + (message.length > 50 ? '…' : '');
    }

    // Build message history for Anthropic (last 12 messages for context window)
    const contextMessages = session.messages.slice(-12).map((m, idx) => ({
      role: m.role,
      content: idx === session.messages.length - 1 && mood
        ? userContent
        : m.content
    }));

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: contextMessages
    });

    const reply = response.content[0].text;

    // Save assistant reply
    session.messages.push({ role: 'assistant', content: reply });
    await session.save();

    res.json({
      reply,
      sessionId: session._id,
      messageCount: session.messages.length
    });
  } catch (err) {
    console.error('Chat error:', err);
    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid Anthropic API key.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
    }
    res.status(500).json({ error: 'Failed to get response.' });
  }
});

// ── DELETE /api/chat/:sessionId ──────────────
router.delete('/:sessionId', protect, async (req, res) => {
  try {
    await Chat.findOneAndDelete({
      _id: req.params.sessionId,
      userId: req.user._id
    });
    res.json({ message: 'Session deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete session.' });
  }
});

module.exports = router;
