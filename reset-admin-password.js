const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Database connection
mongoose.connect('mongodb://localhost:27017/smart-waste-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Reset admin password and update email
async function resetAdminPassword() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Update by role 'admin' to handle both old and new email
    const user = await User.findOneAndUpdate(
      { role: 'admin' },
      { 
        email: 'admin@gmail.com',
        password: hashedPassword 
      },
      { new: true, select: '+password' }
    );

    if (!user) {
      console.log('Admin user not found');
      mongoose.disconnect();
      return;
    }

    console.log('Admin credentials updated:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: password123');
    console.log('Updated user:', user);
    mongoose.disconnect();
  } catch (error) {
    console.error('Error resetting admin password:', error);
    mongoose.disconnect();
  }
}

resetAdminPassword();
