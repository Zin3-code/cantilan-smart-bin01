const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('./models/Task');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bin-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Cleanup test tasks
async function cleanupTestTasks() {
  try {
    // Find and delete test tasks
    const testTasks = await Task.find({ binName: { $regex: /Test Bin/ } });
    console.log(`Found ${testTasks.length} test tasks to delete`);
    
    for (const task of testTasks) {
      await Task.findByIdAndDelete(task._id);
      console.log(`Deleted task: ${task.taskId} - ${task.binName}`);
    }
    
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  // Disconnect from MongoDB
  mongoose.connection.close();
  console.log('Disconnected from MongoDB');
}

// Run cleanup
cleanupTestTasks();
