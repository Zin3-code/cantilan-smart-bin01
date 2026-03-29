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

// Test generateTaskId function
async function testGenerateTaskId() {
  console.log('Testing generateTaskId function...');
  
  try {
    // Get current tasks
    const currentTasks = await Task.find({}, 'taskId').sort({ taskId: -1 });
    console.log('Current tasks:', currentTasks.map(t => t.taskId));
    
    // Generate new task ID
    const newTaskId = await generateTaskId(Task);
    console.log('Generated new task ID:', newTaskId);
    
    // Verify the format
    const formatMatch = newTaskId.match(/^TASK-(\d+)$/);
    if (formatMatch) {
      const number = parseInt(formatMatch[1]);
      console.log('Valid format, numeric part:', number);
      
      // Check if it's sequential
      if (currentTasks.length > 0) {
        const lastTaskId = currentTasks[0].taskId;
        const lastNumberMatch = lastTaskId.match(/^TASK-(\d+)$/);
        
        if (lastNumberMatch) {
          const lastNumber = parseInt(lastNumberMatch[1]);
          if (number === lastNumber + 1) {
            console.log('✓ Task ID is sequential (next number after', lastNumber, 'is', number, ')');
          } else {
            console.warn('⚠ Task ID is not sequential');
          }
        } else {
          console.log('Previous tasks have old format, starting from', number);
        }
      } else {
        console.log('First task, ID:', newTaskId);
      }
    } else {
      console.error('✗ Invalid task ID format:', newTaskId);
    }
    
    return newTaskId;
  } catch (error) {
    console.error('Error generating task ID:', error);
  }
}

// Test creating a task
async function testCreateTask() {
  console.log('\nTesting task creation...');
  
  try {
    const newTaskId = await testGenerateTaskId();
    
    // Create a simple test task
    const testTask = await Task.create({
      taskId: newTaskId,
      binId: new mongoose.Types.ObjectId(), // Random bin ID
      binName: 'Test Bin',
      binLocation: {
        address: 'Test Address',
        latitude: 14.5995,
        longitude: 120.9842
      },
      assignedTo: new mongoose.Types.ObjectId(), // Random user ID
      assignedByName: 'Test Admin'
    });
    
    console.log('✓ Task created successfully:', testTask.taskId);
    
    return testTask;
  } catch (error) {
    console.error('Error creating task:', error);
  }
}

// Run tests
async function runTests() {
  console.log('=== Task ID Generation Test ===');
  await testCreateTask();
  console.log('\n=== Cleanup ===');
  
  // Clean up the test task
  try {
    const testTask = await Task.findOne({ binName: 'Test Bin' });
    if (testTask) {
      await Task.findByIdAndDelete(testTask._id);
      console.log('Test task deleted');
    }
  } catch (error) {
    console.error('Error deleting test task:', error);
  }
  
  // Disconnect from MongoDB
  mongoose.connection.close();
  console.log('Disconnected from MongoDB');
}

runTests();
