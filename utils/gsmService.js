const axios = require('axios');
const Message = require('../models/Message');
const { generateMessageId } = require('./generateId');

// Send SMS via GSM module
exports.sendSMS = async (recipientGsm, message, messageType = 'notification') => {
  try {
    // In a real implementation, this would call the GSM API
    // For now, we'll simulate the response
    console.log(`[GSM] Sending SMS to ${recipientGsm}: ${message}`);
    
    // Simulate API call
    const response = {
      success: true,
      messageId: generateMessageId(),
      timestamp: new Date(),
    };

    return response;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error('Failed to send SMS');
  }
};

// Process incoming GSM message
exports.processIncomingMessage = async (senderGsm, content) => {
  try {
    // Parse the message to determine sender type and content
    const messageData = parseGSMMessage(senderGsm, content);
    
    // Save message to database
    const message = await Message.create(messageData);
    
    return message;
  } catch (error) {
    console.error('Error processing incoming message:', error);
    throw new Error('Failed to process incoming message');
  }
};

// Parse GSM message to extract structured data
const parseGSMMessage = (senderGsm, content) => {
  const messageData = {
    messageId: generateMessageId(),
    senderGsm,
    content,
    timestamp: new Date(),
  };

  // Parse message format: TYPE|ID|MESSAGE
  const parts = content.split('|');
  
  if (parts.length >= 3) {
    const type = parts[0].toUpperCase();
    const id = parts[1];
    const message = parts.slice(2).join('|');

    if (type === 'BIN') {
      messageData.sender = 'bin';
      messageData.senderId = id;
      messageData.senderName = `Bin ${id}`;
      messageData.messageType = 'alert';
      messageData.recipient = 'admin';
    } else if (type === 'COLLECTOR') {
      messageData.sender = 'collector';
      messageData.senderId = id;
      messageData.senderName = `Collector ${id}`;
      messageData.messageType = 'update';
      messageData.recipient = 'admin';
    }
  } else {
    // Default parsing
    messageData.sender = 'unknown';
    messageData.senderId = 'unknown';
    messageData.senderName = 'Unknown';
    messageData.messageType = 'other';
    messageData.recipient = 'admin';
  }

  return messageData;
};

// Send bin alert to admin
exports.sendBinAlert = async (bin, alertType) => {
  const alertMessages = {
    'near-full': `ALERT: Bin ${bin.binId} at ${bin.location.address} is ${bin.currentLevel}% full. Collection needed soon.`,
    'full': `URGENT: Bin ${bin.binId} at ${bin.location.address} is FULL (${bin.currentLevel}%). Immediate collection required.`,
    'offline': `WARNING: Bin ${bin.binId} at ${bin.location.address} is OFFLINE. Check device connectivity.`,
  };

  const message = alertMessages[alertType] || `Alert for bin ${bin.binId}`;
  
  // Send to admin (in real implementation, get admin GSM numbers)
  await exports.sendSMS('ADMIN_GSM', message, 'alert');
  
  // Log the message
  await Message.create({
    messageId: generateMessageId(),
    sender: 'bin',
    senderId: bin.binId,
    senderName: bin.name,
    senderGsm: bin.gsmNumber,
    recipient: 'admin',
    recipientName: 'Administrator',
    messageType: 'alert',
    content: message,
    relatedBinId: bin._id,
  });
};

// Send task notification to collector
exports.sendTaskNotification = async (task, collector) => {
  const message = `NEW TASK: ${task.taskId}. Collect from ${task.binName} at ${task.binLocation.address}. Priority: ${task.priority}. Instructions: ${task.instructions || 'None'}`;
  
  await exports.sendSMS(collector.gsmNumber, message, 'notification');
  
  await Message.create({
    messageId: generateMessageId(),
    sender: 'admin',
    senderId: 'admin',
    senderName: 'Administrator',
    senderGsm: 'ADMIN_GSM',
    recipient: 'collector',
    recipientId: collector._id.toString(),
    recipientName: collector.name,
    recipientGsm: collector.gsmNumber,
    messageType: 'notification',
    content: message,
    relatedTaskId: task._id,
  });
};
