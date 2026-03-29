const crypto = require('crypto');

// Generate unique ID for various entities
exports.generateId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${randomStr}`;
};

// Generate auto-incrementing task ID
exports.generateTaskId = async (TaskModel) => {
  try {
    // Find the task with the highest numeric ID
    const tasks = await TaskModel.find({}, 'taskId').sort({ taskId: -1 }).limit(1);
    
    let nextNumber = 1;
    if (tasks.length > 0) {
      const lastId = tasks[0].taskId;
      
      // Extract numeric part from task ID
      const numericMatch = lastId.match(/^TASK-(\d+)$/);
      if (numericMatch) {
        // If it's the new format (TASK-XXX)
        nextNumber = parseInt(numericMatch[1]) + 1;
      } else {
        // If it's the old format (TASK-timestamp-random), check if there are any new format IDs
        const newFormatTasks = await TaskModel.find({ taskId: { $regex: '^TASK-\\d+$' } }, 'taskId').sort({ taskId: -1 }).limit(1);
        if (newFormatTasks.length > 0) {
          const newFormatLastId = newFormatTasks[0].taskId;
          const newNumericMatch = newFormatLastId.match(/^TASK-(\d+)$/);
          if (newNumericMatch) {
            nextNumber = parseInt(newNumericMatch[1]) + 1;
          }
        } else {
          // If no new format IDs exist, start from 1
          nextNumber = 1;
        }
      }
    }
    
    // Format with leading zeros (3 digits for consistency)
    const formattedNumber = String(nextNumber).padStart(3, '0');
    return `TASK-${formattedNumber}`;
  } catch (error) {
    console.error('Error generating task ID:', error);
    // Fallback to old format if there's an error
    return exports.generateId('TASK');
  }
};

// Generate bin ID
exports.generateBinId = () => exports.generateId('BIN');

// Generate message ID
exports.generateMessageId = () => exports.generateId('MSG');
