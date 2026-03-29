const Bin = require('../models/Bin');
const { generateBinId } = require('../utils/generateId');
const { sendBinAlert } = require('../utils/gsmService');

// @desc    Get all bins
// @route   GET /api/bins
// @access  Private/Admin
exports.getAllBins = async (req, res) => {
  try {
    const { status, area } = req.query;
    const filter = {};

    if (status) {
      if (status === 'offline') {
        filter.isOnline = false;
      } else {
        filter.status = status;
      }
    }

    if (area) {
      filter['location.area'] = area;
    }

    const bins = await Bin.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bins.length,
      data: bins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single bin
// @route   GET /api/bins/:id
// @access  Private
exports.getBin = async (req, res) => {
  try {
    const bin = await Bin.findById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new bin
// @route   POST /api/bins
// @access  Private/Admin
exports.createBin = async (req, res) => {
  try {
    const binData = {
      ...req.body,
      binId: generateBinId(),
    };

    const bin = await Bin.create(binData);

    res.status(201).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update bin
// @route   PUT /api/bins/:id
// @access  Private/Admin
exports.updateBin = async (req, res) => {
  try {
    let bin = await Bin.findById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    bin = await Bin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete bin
// @route   DELETE /api/bins/:id
// @access  Private/Admin
exports.deleteBin = async (req, res) => {
  try {
    const bin = await Bin.findById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    await bin.deleteOne();

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

// @desc    Update bin fill level (from ESP32)
// @route   POST /api/bins/:id/update-level
// @access  Public (with device authentication)
exports.updateBinLevel = async (req, res) => {
  try {
    const { deviceId, level } = req.body;

    let bin = await Bin.findById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    // Verify device ID
    if (bin.deviceId !== deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized device',
      });
    }

    const previousStatus = bin.status;
    bin.currentLevel = level;
    bin.lastUpdate = Date.now();
    bin.lastSeen = Date.now();
    bin.isOnline = true;

    // Add to fill history
    bin.fillHistory.push({
      level,
      timestamp: Date.now(),
    });

    // Keep only last 100 history entries
    if (bin.fillHistory.length > 100) {
      bin.fillHistory = bin.fillHistory.slice(-100);
    }

    // Update status
    const newStatus = bin.updateStatus();

    // Check for alerts
    const nearFullThreshold = parseInt(process.env.NEAR_FULL_THRESHOLD) || 75;
    const fullThreshold = parseInt(process.env.FULL_THRESHOLD) || 90;

    if (level >= fullThreshold && previousStatus !== 'full') {
      // Send full alert
      bin.alerts.push({
        type: 'full',
        message: `Bin is at ${level}% capacity`,
        timestamp: Date.now(),
      });
      await sendBinAlert(bin, 'full');
    } else if (level >= nearFullThreshold && previousStatus !== 'near-full' && previousStatus !== 'full') {
      // Send near-full alert
      bin.alerts.push({
        type: 'near-full',
        message: `Bin is at ${level}% capacity`,
        timestamp: Date.now(),
      });
      await sendBinAlert(bin, 'near-full');
    }

    await bin.save();

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bin statistics
// @route   GET /api/bins/stats/overview
// @access  Private/Admin
exports.getBinStats = async (req, res) => {
  try {
    const bins = await Bin.find();

     const stats = {
       total: bins.length,
       online: bins.filter(b => b.isOnline).length,
       offline: bins.filter(b => !b.isOnline).length,
       empty: bins.filter(b => b.isOnline && b.status === 'empty').length,
       medium: bins.filter(b => b.isOnline && b.status === 'medium').length,
       full: bins.filter(b => b.isOnline && b.status === 'full').length,
       averageFillLevel: bins.length > 0 
         ? Math.round(bins.reduce((sum, b) => sum + b.currentLevel, 0) / bins.length)
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

// @desc    Mark bin as collected (reset level)
// @route   POST /api/bins/:id/collect
// @access  Private
exports.collectBin = async (req, res) => {
  try {
    let bin = await Bin.findById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    bin.currentLevel = 0;
    bin.lastUpdate = Date.now();
    bin.updateStatus();

    await bin.save();

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
