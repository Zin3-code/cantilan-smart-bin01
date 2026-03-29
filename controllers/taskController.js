const Task = require('../models/Task');
const Bin = require('../models/Bin');
const User = require('../models/User');
const Message = require('../models/Message');
const { generateTaskId, generateMessageId } = require('../utils/generateId');
const { sendTaskNotification } = require('../utils/gsmService');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private/Admin
exports.getAllTasks = async (req, res) => {
  try {
    const { status, assignedTo, priority } = req.query;
    let query = {};

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

     const tasks = await Task.find(query)
      .populate('assignedTo', 'name email phone gsmNumber')
      .populate('binId', 'binId name location currentLevel status isOnline')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get tasks for current collector
// @route   GET /api/tasks/my-tasks
// @access  Private/Collector
exports.getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let query = { assignedTo: req.user.id };

    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('binId', 'binId name location currentLevel status isOnline')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
     const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email phone gsmNumber')
      .populate('binId', 'binId name location currentLevel status isOnline');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is authorized
    if (req.user.role !== 'admin' && task.assignedTo._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res) => {
  try {
    const { binId, assignedTo, priority, instructions, estimatedDuration } = req.body;

    // Get bin details
    const bin = await Bin.findById(binId);
    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    // Get collector details
    const collector = await User.findById(assignedTo);
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    const taskData = {
      taskId: await generateTaskId(Task),
      binId,
      binName: bin.name,
      binLocation: bin.location,
      assignedTo,
      assignedByName: req.user.name,
      priority: priority || 'medium',
      instructions: instructions || '',
      estimatedDuration: estimatedDuration || 30,
    };

    const task = await Task.create(taskData);

    // Send notification to collector
    await sendTaskNotification(task, collector);

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await task.deleteOne();

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

// @desc    Start task (collector)
// @route   POST /api/tasks/:id/start
// @access  Private/Collector
exports.startTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if task is assigned to current user
    if (task.assignedTo.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this task',
      });
    }

    // Check if task is already started or completed
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be started',
      });
    }

    task.status = 'in-progress';
    task.startedAt = Date.now();

    // Add GSM update
    task.gsmUpdates.push({
      type: 'start',
      message: `Task started by ${req.user.name}`,
      timestamp: Date.now(),
    });

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Complete task (collector)
// @route   POST /api/tasks/:id/complete
// @access  Private/Collector
exports.completeTask = async (req, res) => {
  try {
    const { notes, issueReported } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if task is assigned to current user
    if (task.assignedTo.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this task',
      });
    }

    // Check if task is in progress
    if (task.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be completed',
      });
    }

    task.status = 'completed';
    task.completedAt = Date.now();
    task.notes = notes || '';
    task.issueReported = issueReported || '';

    // Calculate duration
    task.calculateDuration();

    // Add GSM update
    task.gsmUpdates.push({
      type: 'complete',
      message: `Task completed by ${req.user.name}`,
      timestamp: Date.now(),
    });

    await task.save();

    // Update collector's task count
    const collector = await User.findById(req.user.id);
    collector.tasksCompleted += 1;
    await collector.save();

    // Create issue message for admin when collector reports an issue
    if (task.issueReported) {
      try {
        const issueSummary = task.issueReported.replace(/^ISSUE REPORT:\s*/i, '');
        const messageContent = `Task ${task.taskId} (${task.binName}): ${issueSummary}`;
        const issueMessage = await Message.create({
          messageId: generateMessageId(),
          sender: 'collector',
          senderId: req.user.id.toString(),
          senderName: req.user.name,
          senderGsm: req.user.gsmNumber,
          recipient: 'admin',
          recipientName: 'Administrator',
          messageType: 'issue',
          content: messageContent,
          relatedTaskId: task._id,
        });

        const io = req.app.get('io');
        if (io) {
          io.to('admin').emit('new-message', issueMessage);
        }
      } catch (messageError) {
        console.error('Error creating issue message:', messageError);
      }
    }

    // Reset bin level
    const bin = await Bin.findById(task.binId);
    if (bin) {
      bin.currentLevel = 0;
      bin.updateStatus();
      await bin.save();
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
// @access  Private/Admin
exports.getTaskStats = async (req, res) => {
  try {
    const tasks = await Task.find();

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      averageDuration: tasks.filter(t => t.actualDuration).length > 0
        ? Math.round(tasks.filter(t => t.actualDuration).reduce((sum, t) => sum + t.actualDuration, 0) / tasks.filter(t => t.actualDuration).length)
        : 0,
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

// @desc    Get collector performance
// @route   GET /api/tasks/stats/collector/:id
// @access  Private/Admin
exports.getCollectorPerformance = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.params.id });

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const averageDuration = completedTasks.length > 0
      ? Math.round(completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length)
      : 0;

    const performance = {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      averageDuration,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    };

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
