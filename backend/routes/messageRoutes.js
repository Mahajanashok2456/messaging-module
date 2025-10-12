const express = require('express');
const { sendMessage, getChatHistory } = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/send', auth, sendMessage);
router.get('/history/:userId', auth, getChatHistory);

module.exports = router;