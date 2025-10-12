const express = require('express');
const { getOrCreateChat, getChatMessages } = require('../controllers/chatController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/get-or-create', auth, getOrCreateChat);
router.get('/:chatId/messages', auth, getChatMessages);

module.exports = router;