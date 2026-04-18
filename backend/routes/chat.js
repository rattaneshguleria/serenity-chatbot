const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Serenity, a warm, empathetic AI stress management companion.
- Deeply caring, calm, and non-judgmental
- Use gentle, supportive language, never clinical or cold
- When someone is stressed, first acknowledge their feelings before offering solutions
- Offer practical stress relief: breathing exercises (box breathing, 4-7-8 breathing), mindfulness, grounding techniques (5-4-3-2-1), progressive muscle relaxation, journaling prompts
- Keep responses concise but warm
- If someone seems in crisis, gently suggest professional help
- Format tips with simple markdown when helpful
- End with a gentle closing or open question
- Your tagline: "Your calm companion in a chaotic world"`;

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
    console.error('Session error:', err);
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

router.post('/:sessionId', protect, async (req, res) => {
  try {
    const { message, mood } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const session = await Chat.findOne({
      _id: req.params.sessionId,
      userId: req.user._id
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    session.messages.push({ role: 'user', content: message.trim() });
    if (session.messages.length === 1) {
      session.title = message.trim().slice(0, 50) + (message.length > 50 ? '...' : '');
    }

    // Build conversation history
    const history = session.messages.slice(-13, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    // Use fetch directly to call Gemini REST API
    const apiKey = process.env.GEMINI_API_KEY;
    const userMessage = mood
      ? `[My current mood: ${mood}] ${message.trim()}`
      : message.trim();

    // Build full conversation with system prompt
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I am Serenity, your calm companion. How can I support you today?' }] },
      ...history,
      { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      return res.status(500).json({ error: 'Gemini API error: ' + (data.error?.message || 'Unknown error') });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(500).json({ error: 'No response from Gemini.' });
    }

    session.messages.push({ role: 'assistant', content: reply });
    await session.save();

    res.json({
      reply,
      sessionId: session._id,
      messageCount: session.messages.length
    });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get response: ' + err.message });
  }
});

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