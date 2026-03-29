const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getMyTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  startTask,
  completeTask,
  getTaskStats,
  getCollectorPerformance,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin'), getAllTasks)
  .post(protect, authorize('admin'), createTask);

router.route('/my-tasks')
  .get(protect, getMyTasks);

router.route('/stats/overview')
  .get(protect, authorize('admin'), getTaskStats);

router.route('/stats/collector/:id')
  .get(protect, authorize('admin'), getCollectorPerformance);

router.route('/:id')
  .get(protect, getTask)
  .put(protect, authorize('admin'), updateTask)
  .delete(protect, authorize('admin'), deleteTask);

router.route('/:id/start')
  .post(protect, startTask);

router.route('/:id/complete')
  .post(protect, completeTask);

module.exports = router;
