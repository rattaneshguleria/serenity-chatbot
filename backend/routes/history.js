// ============================================
//   SERENITY - History Routes
//   GET /api/history          → All sessions
//   GET /api/history/:id      → Single session
// ============================================

const express = require('express');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/history ─────────────────────────
// Returns all chat sessions for the logged-in user (titles only, no messages)
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await Chat.find({ userId: req.user._id })
      .select('title mood createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ sessions });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ── GET /api/history/:id ─────────────────────
// Returns full messages for a specific session
router.get('/:id', protect, async (req, res) => {
  try {
    const session = await Chat.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    res.json({ session });
  } catch (err) {
    console.error('Session fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch session.' });
  }
});

module.exports = router;
