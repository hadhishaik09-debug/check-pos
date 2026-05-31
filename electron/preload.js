const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Printer operations
  printReceipt: (escPosData) => ipcRenderer.invoke('print-receipt', escPosData),
  getPrinterStatus: () => ipcRenderer.invoke('get-printer-status'),
  setPrinterAddress: (ip, port) => ipcRenderer.invoke('set-printer-address', ip, port),
  testPrinterConnection: () => ipcRenderer.invoke('test-printer-connection'),
  
  // Printer status updates
  onPrinterStatusChange: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('printer-status-changed', handler);
    return () => ipcRenderer.removeListener('printer-status-changed', handler);
  },

  // Order printing
  printOrder: (orderData) => ipcRenderer.invoke('print-order', orderData),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
});
