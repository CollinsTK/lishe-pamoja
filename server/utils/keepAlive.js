// Keep-alive mechanism to prevent server from sleeping
const https = require('https');
const http = require('http');

class KeepAlive {
  constructor(url, interval = 14) { // 14 minutes (default timeout is usually 15 minutes)
    this.url = url;
    this.interval = interval * 60 * 1000; // Convert to milliseconds
    this.timer = null;
  }

  start() {
    console.log('🔄 Keep-alive mechanism started');
    this.ping(); // Ping immediately
    this.timer = setInterval(() => this.ping(), this.interval);
  }

  ping() {
    try {
      const protocol = this.url.startsWith('https') ? https : http;
      
      const req = protocol.get(this.url, (res) => {
        console.log(`📡 Keep-alive ping: ${res.statusCode} - ${new Date().toISOString()}`);
      });

      req.on('error', (err) => {
        console.error(`❌ Keep-alive ping failed: ${err.message}`);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        console.error('⏱️ Keep-alive ping timeout');
      });

    } catch (error) {
      console.error(`❌ Keep-alive error: ${error.message}`);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 Keep-alive mechanism stopped');
    }
  }
}

module.exports = KeepAlive;
