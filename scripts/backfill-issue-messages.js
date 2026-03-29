require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Task = require('../models/Task');
const Message = require('../models/Message');
const { generateMessageId } = require('../utils/generateId');

const ISSUE_PREFIX_RE = /^ISSUE REPORT:\s*/i;

const getIssueText = (task) => {
  const legacyIssue = (typeof task.notes === 'string' && task.notes.startsWith('ISSUE REPORT:'))
    ? task.notes
    : '';
  return task.issueReported || legacyIssue || '';
};

const buildMessageContent = (task, issueText) => {
  const issueSummary = issueText.replace(ISSUE_PREFIX_RE, '');
  return `Task ${task.taskId} (${task.binName}): ${issueSummary}`;
};

const pickTimestamp = (task) => task.completedAt || task.updatedAt || task.createdAt || new Date();

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  await connectDB();

  const query = {
    $or: [
      { issueReported: { $ne: '' } },
      { notes: { $regex: /^ISSUE REPORT:/ } },
    ],
  };

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name gsmNumber')
    .select('taskId binName issueReported notes assignedTo assignedByName completedAt updatedAt createdAt')
    .exec();

  let created = 0;
  let skipped = 0;

  for (const task of tasks) {
    const issueText = getIssueText(task);
    if (!issueText) {
      skipped += 1;
      continue;
    }

    const existing = await Message.findOne({
      messageType: 'issue',
      relatedTaskId: task._id,
    }).select('_id').exec();

    if (existing) {
      skipped += 1;
      continue;
    }

    const senderName = task.assignedTo?.name || task.assignedByName || 'System';
    const senderId = task.assignedTo?._id?.toString() || 'unknown';
    const senderGsm = task.assignedTo?.gsmNumber || 'UNKNOWN';

    await Message.create({
      messageId: generateMessageId(),
      sender: 'collector',
      senderId,
      senderName,
      senderGsm,
      recipient: 'admin',
      recipientName: 'Administrator',
      messageType: 'issue',
      content: buildMessageContent(task, issueText),
      relatedTaskId: task._id,
      timestamp: pickTimestamp(task),
    });

    created += 1;
  }

  console.log(`Backfill complete. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  mongoose.disconnect();
  process.exit(1);
});
