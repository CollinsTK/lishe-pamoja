const mongoose = require('mongoose');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retryCount = 0) => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in server/.env');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    const isSrvError = err.message?.includes('querySrv') || err.message?.includes('ECONNREFUSED');
    const isAuthError = err.message?.includes('authentication failed') || err.code === 8000;
    const isTimeout = err.message?.includes('timed out') || err.message?.includes('Server selection timed out');

    console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err.message);

    if (isSrvError) {
      console.error('➡ DNS/SRV lookup failed. Likely causes:');
      console.error('   1. MongoDB Atlas cluster is PAUSED (free tier auto-pauses after 7 days)');
      console.error('   2. Your IP is not whitelisted in Atlas Network Access');
      console.error('   3. DNS/firewall blocking port 27017');
    } else if (isAuthError) {
      console.error('➡ Authentication failed - check your MongoDB username/password in .env');
    } else if (isTimeout) {
      console.error('➡ Connection timed out - cluster may be paused or network is slow');
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    }

    console.error('❌ Max retries reached. Server shutting down.');
    console.error('➡ FIX: Go to https://cloud.mongodb.com → check if cluster is paused → click RESUME');
    console.error('➡ OR: Add 0.0.0.0/0 to Network Access → IP Access List');
    process.exit(1);
  }
};

module.exports = connectDB;
