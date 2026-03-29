const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getCollectors,
  updateProfile,
  changePassword,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin'), getAllUsers)
  .post(protect, authorize('admin'), createUser);

router.route('/collectors')
  .get(protect, authorize('admin'), getCollectors);

router.route('/profile')
  .put(protect, updateProfile);

router.route('/change-password')
  .put(protect, changePassword);

router.route('/:id')
  .get(protect, getUser)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
