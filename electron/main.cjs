const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const LANPrinter = require('./lanPrinter');
const receiptFormatter = require('../src/utils/receiptFormatter.js');

let mainWindow;
let lanPrinter;
let printerStatusCheckInterval;

// Create ESC/POS receipt from order data
function formatOrderReceipt(order) {
  const escPosData = receiptFormatter.generateReceipt(order);
  return escPosData;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startURL = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  mainWindow.loadURL(startURL);
  mainWindow.maximize();

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (printerStatusCheckInterval) {
      clearInterval(printerStatusCheckInterval);
    }
  });
}

// Initialize printer service
function initializePrinterService() {
  lanPrinter = new LANPrinter();

  // Periodic printer status check
  printerStatusCheckInterval = setInterval(() => {
    const status = lanPrinter.getPrinterStatus();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('printer-status-changed', status);
    }
  }, 3000);

  // Try initial connection
  lanPrinter.connect().catch(() => {
    console.log('[Printer] Initial connection failed, will retry on demand');
  });
}

// IPC Handlers for Printer Operations
ipcMain.handle('print-receipt', async (_event, escPosData) => {
  try {
    if (!lanPrinter) {
      throw new Error('Printer service not initialized');
    }

    const buffer = Buffer.from(escPosData);
    await lanPrinter.printReceipt(buffer);
    return { success: true, message: 'Receipt printed successfully' };
  } catch (error) {
    console.error('[IPC] Print error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('print-order', async (_event, orderData) => {
  try {
    if (!lanPrinter) {
      throw new Error('Printer service not initialized');
    }

    const escPosData = formatOrderReceipt(orderData);
    const buffer = Buffer.from(escPosData);
    await lanPrinter.printReceipt(buffer);
    return { success: true, message: 'Order printed successfully' };
  } catch (error) {
    console.error('[IPC] Order print error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-printer-status', async () => {
  if (!lanPrinter) {
    return { isConnected: false, ip: 'Not initialized', port: 0 };
  }
  return lanPrinter.getPrinterStatus();
});

ipcMain.handle('set-printer-address', async (_event, ip, port) => {
  try {
    if (!lanPrinter) {
      throw new Error('Printer service not initialized');
    }
    lanPrinter.setPrinterAddress(ip, port);
    return { success: true, message: 'Printer address updated' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('test-printer-connection', async () => {
  try {
    if (!lanPrinter) {
      throw new Error('Printer service not initialized');
    }
    const result = await lanPrinter.testConnection();
    return result;
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    nodeVersion: process.version,
  };
});

app.on('ready', () => {
  createWindow();
  initializePrinterService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('[Main Process] Uncaught exception:', error);
});
