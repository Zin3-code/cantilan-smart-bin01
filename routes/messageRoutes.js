const express = require('express');
const router = express.Router();
const {
  getAllMessages,
  getMessage,
  createMessage,
  receiveGsmMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  getMessageStats,
} = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin'), getAllMessages)
  .post(protect, createMessage);

router.route('/gsm')
  .post(receiveGsmMessage);

router.route('/read-all')
  .put(protect, authorize('admin'), markAllAsRead);

router.route('/stats/overview')
  .get(protect, authorize('admin'), getMessageStats);

router.route('/:id')
  .get(protect, getMessage)
  .put(protect, markAsRead)
  .delete(protect, authorize('admin'), deleteMessage);

module.exports = router;
