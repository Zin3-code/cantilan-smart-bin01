const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('./models/Task');
const { generateTaskId } = require('./utils/generateId');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bin-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Test generateTaskId function multiple times
async function testIncrementingIds() {
  console.log('Testing task ID incrementing...');
  
  try {
    // Get initial tasks
    const initialTasks = await Task.find({}, 'taskId');
    console.log('Initial number of tasks:', initialTasks.length);
    
    // Create 3 test tasks
    const createdTasks = [];
    for (let i = 1; i <= 3; i++) {
      const newTaskId = await generateTaskId(Task);
      
      const testTask = await Task.create({
        taskId: newTaskId,
        binId: new mongoose.Types.ObjectId(), // Random bin ID
        binName: `Test Bin ${i}`,
        binLocation: {
          address: 'Test Address',
          latitude: 14.5995,
          longitude: 120.9842
        },
        assignedTo: new mongoose.Types.ObjectId(), // Random user ID
        assignedByName: 'Test Admin'
      });
      
      console.log(`Created task ${i}:`, testTask.taskId);
      createdTasks.push(testTask);
    }
    
    // Verify all tasks are sequential
    console.log('\n=== Verification ===');
    const allTasks = await Task.find({}, 'taskId').sort({ taskId: 1 });
    
    // Extract only the new test tasks
    const testTasks = allTasks.filter(task => task.binName.startsWith('Test Bin'));
    const testTaskIds = testTasks.map(task => task.taskId);
    
    console.log('Test task IDs:', testTaskIds);
    
    // Check if they are sequential
    const areSequential = testTaskIds.every((id, index) => {
      if (index === 0) return true;
      
      const prevIdMatch = testTaskIds[index - 1].match(/^TASK-(\d+)$/);
      const currIdMatch = id.match(/^TASK-(\d+)$/);
      
      if (!prevIdMatch || !currIdMatch) return false;
      
      return parseInt(currIdMatch[1]) === parseInt(prevIdMatch[1]) + 1;
    });
    
    if (areSequential) {
      console.log('✓ Task IDs are sequential');
    } else {
      console.error('✗ Task IDs are not sequential');
    }
    
    // Cleanup
    console.log('\n=== Cleanup ===');
    for (const task of createdTasks) {
      await Task.findByIdAndDelete(task._id);
      console.log(`Deleted task:`, task.taskId);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
  
  // Disconnect from MongoDB
  mongoose.connection.close();
  console.log('\nDisconnected from MongoDB');
}

// Run tests
async function runTests() {
  console.log('=== Auto-incrementing Task IDs Test ===');
  await testIncrementingIds();
}

runTests();
