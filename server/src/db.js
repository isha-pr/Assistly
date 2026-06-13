const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/assistly';

async function connectDB() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Atlas connected successfully.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    if (err.message.includes('querySrv') || err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      console.log('\n💡 [AssistLy] MongoDB Connection Troubleshooting:');
      console.log('This error indicates that Node.js cannot resolve or reach your MongoDB Atlas cluster.');
      console.log('  1. Verify your system has an active internet connection.');
      console.log('  2. DNS SRV Resolution Issue: Node.js on some Windows machines has trouble resolving the "+srv" records.');
      console.log('     Try copying the connection string format for "Node.js version 2.2.12 or later" (direct replica set connection string starting with "mongodb://" instead of "mongodb+srv://") from your Atlas dashboard.');
      console.log('  3. Firewall: Ensure outbound TCP port 27017 is open and not blocked by any corporate firewall/proxy.');
      console.log('  4. Database Name: Consider specifying a DB name in your connection string (e.g., "...mongodb.net/assistly?appName...") before the query parameters.\n');
    }
    process.exit(1);
  }
}

module.exports = { connectDB };
