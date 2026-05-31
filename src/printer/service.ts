import type { PrinterService, PrinterAddress, PrintableOrder, PrintResult, PrinterStatus } from './types';
import { generateReceiptBuffer } from '../utils/receiptFormatter';

/**
 * In-memory placeholder printer service.
 * - Keeps a minimal implementation so renderer code can depend on a single service API
 * - Does NOT implement QZ Tray yet (placeholder points included)
 * - For Electron desktop builds, the actual runtime will use IPC (preload -> main)
 */

class InMemoryPrinterService implements PrinterService {
  private address: PrinterAddress | undefined;
  private connected = false;

  async getStatus(): Promise<PrinterStatus> {
    return { isConnected: this.connected, address: this.address };
  }

  async setAddress(addr: PrinterAddress): Promise<void> {
    this.address = addr;
    // do not attempt connection here; runtime-specific adapters will handle.
  }

  async printOrder(order: PrintableOrder): Promise<PrintResult> {
    try {
      // Generate ESC/POS bytes using canonical formatter (simulator-only here)
      const buf = generateReceiptBuffer(order as any);
      // In PWA/web context: we cannot open raw socket to printer.
      // This stub simply returns success to avoid breaking flows.
      console.debug('[PrinterService] Simulated print bytes length:', buf.length);
      return { success: true, message: 'Simulated print success (renderer placeholder)' };
    } catch (e: any) {
      return { success: false, message: e?.message ?? String(e) };
    }
  }

  async testConnection(): Promise<PrintResult> {
    // Placeholder: in renderer/PWA, we cannot reach LAN printers directly.
    return { success: true, message: 'Simulator OK' };
  }
}

export const printerService: PrinterService = new InMemoryPrinterService();

export default printerService;
