const Message = require('../models/Message');
const { processIncomingMessage } = require('../utils/gsmService');

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private/Admin
exports.getAllMessages = async (req, res) => {
  try {
    const { sender, recipient, messageType, isRead } = req.query;
    let query = {};

    if (sender) query.sender = sender;
    if (recipient) query.recipient = recipient;
    if (messageType) query.messageType = messageType;
    if (isRead !== undefined) query.isRead = isRead;

    const messages = await Message.find(query)
      .populate('relatedBinId', 'binId name location')
      .populate('relatedTaskId', 'taskId binName status')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('relatedBinId', 'binId name location')
      .populate('relatedTaskId', 'taskId binName status');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new message
// @route   POST /api/messages
// @access  Private
exports.createMessage = async (req, res) => {
  try {
    const message = await Message.create(req.body);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Receive GSM message (from bins/collectors)
// @route   POST /api/messages/gsm
// @access  Public
exports.receiveGsmMessage = async (req, res) => {
  try {
    const { senderGsm, content } = req.body;

    if (!senderGsm || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide sender GSM number and content',
      });
    }

    const message = await processIncomingMessage(senderGsm, content);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    let message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    message.isRead = true;
    message.readAt = Date.now();

    await message.save();

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark all messages as read
// @route   PUT /api/messages/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: 'All messages marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private/Admin
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get message statistics
// @route   GET /api/messages/stats/overview
// @access  Private/Admin
exports.getMessageStats = async (req, res) => {
  try {
    const messages = await Message.find();

    const stats = {
      total: messages.length,
      unread: messages.filter(m => !m.isRead).length,
      fromBins: messages.filter(m => m.sender === 'bin').length,
      fromCollectors: messages.filter(m => m.sender === 'collector').length,
      alerts: messages.filter(m => m.messageType === 'alert').length,
      updates: messages.filter(m => m.messageType === 'update').length,
      issues: messages.filter(m => m.messageType === 'issue').length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
