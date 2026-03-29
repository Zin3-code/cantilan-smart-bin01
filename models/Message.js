const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: [true, 'Please provide a message ID'],
    unique: true,
    trim: true,
  },
  sender: {
    type: String,
    enum: ['bin', 'collector', 'admin'],
    required: [true, 'Please provide the sender type'],
  },
  senderId: {
    type: String,
    required: [true, 'Please provide the sender ID'],
  },
  senderName: {
    type: String,
    required: [true, 'Please provide the sender name'],
  },
  senderGsm: {
    type: String,
    required: [true, 'Please provide the sender GSM number'],
  },
  recipient: {
    type: String,
    enum: ['admin', 'collector', 'bin'],
    required: [true, 'Please provide the recipient type'],
  },
  recipientId: {
    type: String,
  },
  recipientName: {
    type: String,
  },
  recipientGsm: {
    type: String,
  },
  messageType: {
    type: String,
    enum: ['alert', 'update', 'issue', 'confirmation', 'notification', 'other'],
    default: 'notification',
  },
  content: {
    type: String,
    required: [true, 'Please provide the message content'],
  },
  relatedBinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin',
  },
  relatedTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Message', messageSchema);
