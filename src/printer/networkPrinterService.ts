import type { PrinterService, PrinterAddress, PrintableOrder, PrintResult, PrinterStatus } from './types';
import { generateReceiptBuffer } from '../utils/receiptFormatter.ts';

const STORAGE_KEY = 'pos:selectedPrinterAddress';

/**
 * NetworkPrinterService attempts to send raw ESC/POS bytes directly to a
 * networked thermal printer. Browsers can't open raw TCP sockets, so we
 * try a few strategies in order of likelihood:
 *  - If running inside a WebView/Android bridge exposing `AndroidNativePrinter`, use it.
 *  - Try WebSocket to ws://{ip}:{port} (some printers/proxies support this).
 *  - Try HTTP POST to http://{ip}:{port}/ with body as ArrayBuffer and `no-cors`.
 *
 * These are best-effort fallbacks; success depends on printer/support on the network.
 */
export class NetworkPrinterService implements PrinterService {
  private address: PrinterAddress | undefined;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.address = JSON.parse(raw) as PrinterAddress;
    } catch {
      // ignore
    }
  }

  // Lightweight status: attempt to verify connectivity if an address exists.
  async getStatus(): Promise<PrinterStatus> {
    if (!this.address || !this.address.ip) return { isConnected: false, address: this.address };
    try {
      const res = await this.testAddress(this.address.ip, this.address.port ?? 9100);
      return { isConnected: !!res.success, address: this.address, lastError: res.success ? undefined : res.message };
    } catch (e: any) {
      return { isConnected: false, address: this.address, lastError: e?.message ?? String(e) };
    }
  }

  async setAddress(addr: PrinterAddress): Promise<void> {
    this.address = addr;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addr));
    } catch {
      // ignore
    }
  }

  private async tryWebSocketSend(ip: string, port: number, data: Uint8Array): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://${ip}:${port}`);
        ws.binaryType = 'arraybuffer';
        const cleanup = () => {
          try { ws.close(); } catch { }
        };
        ws.onopen = () => {
            try {
            // Cast buffer to ArrayBuffer to satisfy TS and runtime expectations
            ws.send(data.buffer as ArrayBuffer);
            cleanup();
            resolve(true);
          } catch (e) {
            cleanup();
            resolve(false);
          }
        };
        ws.onerror = () => {
          cleanup();
          resolve(false);
        };
        // timeout
        setTimeout(() => { cleanup(); resolve(false); }, 3000);
      } catch (e) {
        resolve(false);
      }
    });
  }

  private async tryFetchSend(ip: string, port: number, data: Uint8Array): Promise<boolean> {
    try {
      const url = `http://${ip}:${port}/`;
      // Some printers accept raw TCP over HTTP POST or a specific endpoint; this is a best-effort.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        // send raw ArrayBuffer for broader compatibility
        body: (data.buffer as ArrayBuffer),
        headers: { 'Content-Type': 'application/octet-stream' },
        keepalive: true,
      });
      // We can't reliably read response in no-cors; assume success if no exception
      return true;
    } catch (e) {
      return false;
    }
  }

  private async tryAndroidBridge(ip: string, port: number, data: Uint8Array): Promise<boolean> {
    try {
      // If the PWA is running inside an Android WebView exposing a native bridge
      // named AndroidNativePrinter with a printBytes method, use it.
      const anyWin = window as any;
      if (anyWin.AndroidNativePrinter && typeof anyWin.AndroidNativePrinter.printBytes === 'function') {
        try {
          const base64 = btoa(String.fromCharCode(...data));
          // bridge expected arguments may vary; this is an optimistic best-effort
          const res = anyWin.AndroidNativePrinter.printBytes(ip, port, base64);
          return !!res;
        } catch (e) {
          return false;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Test a specific address without mutating stored address
  async testAddress(ip: string, port: number): Promise<PrintResult> {
    try {
      const u8 = new Uint8Array([]);
      // Try Android bridge first
      const viaBridge = await this.tryAndroidBridge(ip, port, u8);
      if (viaBridge) return { success: true, message: 'Printed via Android bridge' };
      // Try WebSocket
      const viaWs = await this.tryWebSocketSend(ip, port, u8);
      if (viaWs) return { success: true, message: 'WebSocket connect OK' };
      // Try fetch POST
      const viaFetch = await this.tryFetchSend(ip, port, u8);
      if (viaFetch) return { success: true, message: 'HTTP POST OK (no-cors)' };
      return { success: false, message: 'No supported transport succeeded' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? String(e) };
    }
  }

  async printOrder(order: PrintableOrder): Promise<PrintResult> {
    try {
      if (!this.address || !this.address.ip) {
        return { success: false, message: 'No network printer configured' };
      }

      const raw = generateReceiptBuffer(order as any);
      const u8: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as any);

      const ip = this.address.ip;
      const port = this.address.port ?? 9100;

      // Try Android bridge first
      const viaBridge = await this.tryAndroidBridge(ip, port, u8);
      if (viaBridge) return { success: true, message: 'Printed via Android bridge' };

      // Try WebSocket
      const viaWs = await this.tryWebSocketSend(ip, port, u8);
      if (viaWs) return { success: true, message: 'Printed via WebSocket' };

      // Try fetch POST
      const viaFetch = await this.tryFetchSend(ip, port, u8);
      if (viaFetch) return { success: true, message: 'Printed via HTTP POST (no-cors)' };

      return { success: false, message: 'Network print failed: no supported transport succeeded' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? String(e) };
    }
  }

  async testConnection(): Promise<PrintResult> {
    if (!this.address || !this.address.ip) return { success: false, message: 'No network printer configured' };
    return this.testAddress(this.address.ip, this.address.port ?? 9100);
  }
}

export const networkPrinterService = new NetworkPrinterService();
export default networkPrinterService;

// Convenience helper for UI code
export async function testNetworkConnection(): Promise<PrintResult> {
  return networkPrinterService.testConnection();
}
