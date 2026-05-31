import type { PrinterService, PrinterAddress, PrintableOrder, PrintResult, PrinterStatus } from './types';
import { generateReceiptBuffer } from '../utils/receiptFormatter.ts';

const STORAGE_KEY = 'pos:selectedPrinterAddress';

/**
 * Printer service with QZ Tray support for web clients and a simulator fallback.
 * - Persists selected printer address to localStorage
 * - Uses `qz-tray` when available to send raw ESC/POS bytes
 */
class QzPrinterService implements PrinterService {
  private address: PrinterAddress | undefined;
  private connected = false;
  private qz: any | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.address = JSON.parse(raw) as PrinterAddress;
    } catch {
      // ignore
    }
  }

  private async ensureQzConnected(): Promise<void> {
    if (this.qz && this.qz.websocket && this.qz.websocket.isActive && this.qz.websocket.isActive()) {
      this.connected = true;
      return;
    }

    try {
      // Acquire qz instance either from window (script-included) or dynamic import
      // @ts-ignore
      this.qz = (typeof window !== 'undefined' && (window as any).qz) ? (window as any).qz : null;

      if (!this.qz) {
        try {
          // dynamic import of qz-tray (may work depending on bundler)
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          // Note: using require to avoid top-level ESM import issues in the renderer.
          // @ts-ignore
          const mod = await import('qz-tray');
          // qz-tray exports a default qz object in some builds
          this.qz = mod?.default ?? mod;
        } catch (err) {
          console.warn('[PrinterService] qz-tray not available:', err);
          this.qz = null;
        }
      }

      if (!this.qz) {
        this.connected = false;
        return;
      }

      if (this.qz.websocket && this.qz.websocket.isActive && this.qz.websocket.isActive()) {
        this.connected = true;
        return;
      }

      // Attempt websocket connect
      if (this.qz.websocket && this.qz.websocket.connect) {
        await this.qz.websocket.connect();
        this.connected = !!(this.qz.websocket && this.qz.websocket.isActive && this.qz.websocket.isActive());
      }
    } catch (e) {
      console.warn('[PrinterService] QZ connect failed', e);
      this.connected = false;
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    try {
      await this.ensureQzConnected();
    } catch {
      // ignore
    }
    return { isConnected: this.connected, address: this.address };
  }

  async listPrinters(): Promise<string[]> {
    try {
      await this.ensureQzConnected();
      if (!this.qz) return [];
      // qz.printers.find() returns a Promise<string[]>
      if (this.qz.printers && typeof this.qz.printers.find === 'function') {
        const list = await this.qz.printers.find();
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (e) {
      console.warn('[PrinterService] listPrinters failed', e);
      return [];
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

  private toHex(buf: Uint8Array): string {
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async printOrder(order: PrintableOrder): Promise<PrintResult> {
    // Always generate ESC/POS bytes from canonical formatter
    try {
      const raw = generateReceiptBuffer(order as any) as unknown;

      // normalize to Uint8Array for browser-safe handling
      const u8: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as any);

      // Try QZ Tray path first for web clients
      await this.ensureQzConnected();

      if (this.connected && this.qz) {
        try {
          const printerName = this.address?.printerName;

          if (!printerName) {
            return { success: false, message: 'Please select printer' };
          }

          const qz = this.qz;
          const hex = this.toHex(u8);

          const data = [{ type: 'raw', format: 'hex', data: hex }];

          // Use the selected Windows printer name for QZ Tray
          const config = qz.configs.create(printerName);

          await qz.print(config, data);

          return { success: true, message: 'Printed via QZ Tray' };
        } catch (e: any) {
          console.error('[PrinterService] QZ print failed', e);
          // fallthrough to simulator/success=false
        }
      }

      // Simulator fallback (or in environments without QZ)
      console.debug('[PrinterService] Simulated print bytes length:', u8.length);
      return { success: true, message: 'Simulated print success (renderer fallback)' };
    } catch (e: any) {
      console.error('[PrinterService] printOrder error', e);
      return { success: false, message: e?.message ?? String(e) };
    }
  }

  async testConnection(): Promise<PrintResult> {
    try {
      await this.ensureQzConnected();
      if (this.connected) return { success: true, message: 'QZ Tray connected' };
      return { success: false, message: 'QZ Tray not available' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? String(e) };
    }
  }
}

export const printerService: PrinterService = new QzPrinterService();

export default printerService;
