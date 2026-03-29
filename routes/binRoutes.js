console.log("✅ binRoutes loaded from:", __filename);
// backend/routes/binRoutes.js

const express = require('express');
const router = express.Router();
const Bin = require('../models/Bin');

const {
  getAllBins,
  getBin,
  createBin,
  updateBin,
  deleteBin,
  updateBinLevel,
  getBinStats,
  collectBin,
} = require('../controllers/binController');

const { protect, authorize } = require('../middleware/auth');


// ===============================
// ADMIN ROUTES
// ===============================

router.route('/')
  .get(protect, authorize('admin'), getAllBins)
  .post(protect, authorize('admin'), createBin);

router.route('/stats/overview')
  .get(protect, authorize('admin'), getBinStats);

router.get('/iot/test', (req, res) => {
  res.json({ ok: true, msg: 'iot routes loaded' });
});


// ===============================
// ✅ IoT UPDATE ROUTE (ESP32)
// IMPORTANT: Must be ABOVE "/:id"
// ===============================

router.post('/iot/update', async (req, res) => {
  try {
    const {
      deviceId,
      distanceCm,
      emptyDistanceCm = 40,  // distance when bin is empty
      fullDistanceCm = 10    // distance when bin is full
    } = req.body;

    if (!deviceId || distanceCm === undefined) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and distanceCm are required'
      });
    }

    const bin = await Bin.findOne({ deviceId });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found for this device'
      });
    }

    const d = Number(distanceCm);
    const emptyD = Number(emptyDistanceCm);
    const fullD = Number(fullDistanceCm);

    // Convert distance → fill percentage
    const ratio = (emptyD - d) / (emptyD - fullD);
    const clamped = Math.max(0, Math.min(1, ratio));
    const levelPercent = Math.round(clamped * 100);

    // Update bin fields
    bin.currentLevel = levelPercent;
    bin.isOnline = true;
    bin.lastSeen = new Date();
    bin.lastUpdate = new Date();

    // Add to history (limit size to prevent huge documents)
    bin.fillHistory.push({
      level: levelPercent,
      timestamp: new Date()
    });

    if (bin.fillHistory.length > 200) {
      bin.fillHistory.shift();
    }

    // Update status using your schema method
    bin.updateStatus();

    await bin.save();

    // Emit real-time update to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('bin-update', bin);
    }

    return res.json({
      success: true,
      data: {
        binId: bin.binId,
        deviceId: bin.deviceId,
        currentLevel: bin.currentLevel,
        status: bin.status
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ===============================
// OTHER BIN ROUTES
// ===============================

router.route('/:id')
  .get(protect, getBin)
  .put(protect, authorize('admin'), updateBin)
  .delete(protect, authorize('admin'), deleteBin);

router.route('/:id/update-level')
  .post(updateBinLevel);

router.route('/:id/collect')
  .post(protect, collectBin);


module.exports = router;