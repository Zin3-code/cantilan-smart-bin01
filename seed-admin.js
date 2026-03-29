const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Database connection
mongoose.connect('mongodb://localhost:27017/smart-waste-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create admin user
async function createAdmin() {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      mongoose.disconnect();
      return;
    }

    const admin = new User({
      name: 'Admin',
      email: 'admin@gmail.com',
      password: 'password123',
      role: 'admin',
      phone: '1234567890',
      gsmNumber: '+1234567890',
      isActive: true,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);

    await admin.save();
    console.log('Admin user created successfully');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
    mongoose.disconnect();
  }
}

createAdmin();
