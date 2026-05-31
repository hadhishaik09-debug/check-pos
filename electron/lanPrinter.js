const net = require('net');
const Store = require('electron-store');

const store = new Store();

class LANPrinter {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.printerIP = store.get('printerIP', '192.168.1.100');
    this.printerPort = store.get('printerPort', 9100);
  }

  setPrinterAddress(ip, port) {
    this.printerIP = ip;
    this.printerPort = port;
    store.set('printerIP', ip);
    store.set('printerPort', port);
    this.disconnect();
  }

  getPrinterStatus() {
    return {
      isConnected: this.isConnected,
      ip: this.printerIP,
      port: this.printerPort,
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      this.socket = new net.Socket();
      let connected = false;

      // Set a connection timeout
      const timeoutMs = 5000;
      const onConnect = () => {
        connected = true;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.socket.setTimeout(0);
        console.log(`[LAN Printer] Connected to ${this.printerIP}:${this.printerPort}`);
        resolve(true);
      };

      this.socket.setTimeout(timeoutMs);
      this.socket.once('connect', onConnect);

      this.socket.once('timeout', () => {
        if (!connected) {
          console.error('[LAN Printer] Connection timed out');
          this.socket.destroy();
          this.isConnected = false;
          this.attemptReconnect();
          reject(new Error('Connection timed out'));
        }
      });

      this.socket.connect(this.printerPort, this.printerIP);

      this.socket.on('error', (err) => {
        console.error(`[LAN Printer] Connection error: ${err.message}`);
        this.isConnected = false;
        this.attemptReconnect();
        if (!connected) reject(err);
      });

      this.socket.on('close', (hadError) => {
        console.log('[LAN Printer] Connection closed', hadError ? 'due to error' : '');
        this.isConnected = false;
      });
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`[LAN Printer] Reconnecting attempt ${this.reconnectAttempts}...`);
        this.connect().catch(() => {
          // Reconnect will retry
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.isConnected = false;
    }
  }

  async printReceipt(escPosData) {
    try {
      await this.connect();

      if (!this.socket || !this.isConnected) {
        throw new Error('Socket not available');
      }

      // Write with retry for transient errors
      const maxWriteAttempts = 3;
      let attempt = 0;

      const doWrite = () =>
        new Promise((resolve, reject) => {
          attempt++;
          try {
            const flushed = this.socket.write(escPosData, (err) => {
              if (err) {
                console.error(`[LAN Printer] Write error (attempt ${attempt}): ${err.message}`);
                this.isConnected = false;
                if (attempt < maxWriteAttempts) {
                  setTimeout(() => {
                    // Try to reconnect then retry
                    this.attemptReconnect();
                    resolve(doWrite());
                  }, 200 * attempt);
                } else {
                  reject(err);
                }
              } else {
                console.log('[LAN Printer] Receipt printed successfully');
                resolve(true);
              }
            });

            // If write returns false, wait for 'drain'
            if (flushed === false) {
              this.socket.once('drain', () => {
                console.log('[LAN Printer] socket drain, continuing');
              });
            }
          } catch (e) {
            reject(e);
          }
        });

      return await doWrite();
    } catch (error) {
      console.error(`[LAN Printer] Print error: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.connect();
      
      // Send test receipt
      const testData = Buffer.from([
        0x1b, 0x40, // Initialize
        0x1b, 0x61, 0x01, // Center align
        0x1b, 0x45, 0x01, // Double height on
        0x1b, 0x77, 0x01, // Double width on
      ]);
      
      const testText = 'TEST OK';
      const buffer = Buffer.concat([
        testData,
        Buffer.from(testText, 'utf8'),
        Buffer.from([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]), // New lines and cut
      ]);

      await this.printReceipt(buffer);
      return { success: true, message: 'Printer connection test successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = LANPrinter;
