const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  binId: {
    type: String,
    required: [true, 'Please provide a bin ID'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a bin name'],
    trim: true,
  },
  location: {
    address: {
      type: String,
      required: [true, 'Please provide an address'],
    },
    latitude: {
      type: Number,
      required: [true, 'Please provide latitude'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please provide longitude'],
    },
    area: {
      type: String,
      required: [true, 'Please provide the area name'],
    },
  },
  capacity: {
    type: Number,
    default: 100, // Percentage
  },
  currentLevel: {
    type: Number,
    default: 0, // Percentage
  },
  status: {
    type: String,
    enum: ['empty', 'medium', 'full', 'offline'],
    default: 'empty',
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  gsmNumber: {
    type: String,
    required: [true, 'Please provide a GSM number for the bin'],
  },
  deviceId: {
    type: String,
    required: [true, 'Please provide the ESP32 device ID'],
  },
  type: {
    type: String,
    enum: ['general', 'recyclable', 'organic', 'hazardous', 'electronic'],
    default: 'general',
  },
  fillHistory: [{
    level: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  alerts: [{
    type: {
      type: String,
      enum: ['near-full', 'full', 'offline'],
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  }],
}, {
  timestamps: true,
});

// Update status based on fill level
binSchema.methods.updateStatus = function() {
  if (!this.isOnline) {
    this.status = 'offline';
  } else if (this.currentLevel >= 66) {
    this.status = 'full';
  } else if (this.currentLevel >= 33) {
    this.status = 'medium';
  } else {
    this.status = 'empty';
  }
  return this.status;
};

module.exports = mongoose.model('Bin', binSchema);
