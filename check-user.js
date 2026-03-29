const mongoose = require('mongoose');
const User = require('./models/User');

// Database connection
mongoose.connect('mongodb://localhost:27017/smart-waste-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Check user
async function checkUser() {
  try {
    const user = await User.findOne({ email: 'admin@gmail.com' }).select('+password');
    if (user) {
      console.log('User found:');
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Password:', user.password);
    } else {
      console.log('User not found');
    }
    mongoose.disconnect();
  } catch (error) {
    console.error('Error checking user:', error);
    mongoose.disconnect();
  }
}

checkUser();
