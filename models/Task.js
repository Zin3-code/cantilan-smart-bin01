const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: [true, 'Please provide a task ID'],
    unique: true,
    trim: true,
  },
  binId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin',
    required: [true, 'Please provide a bin ID'],
  },
  binName: {
    type: String,
    required: [true, 'Please provide a bin name'],
  },
  binLocation: {
    address: String,
    latitude: Number,
    longitude: Number,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign a collector'],
  },
  assignedByName: {
    type: String,
    required: [true, 'Please provide the assigner name'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  instructions: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 30,
  },
  actualDuration: {
    type: Number, // in minutes
  },
  notes: {
    type: String,
    default: '',
  },
  issueReported: {
    type: String,
    default: '',
  },
  gsmUpdates: [{
    type: {
      type: String,
      enum: ['start', 'complete', 'issue', 'update'],
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Calculate actual duration
taskSchema.methods.calculateDuration = function() {
  if (this.startedAt && this.completedAt) {
    this.actualDuration = Math.round((this.completedAt - this.startedAt) / 60000); // Convert to minutes
  }
  return this.actualDuration;
};

module.exports = mongoose.model('Task', taskSchema);
