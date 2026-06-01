import type { PrinterService, PrinterAddress, PrintableOrder, PrintResult, PrinterStatus } from './types';
import { networkPrinterService } from './networkPrinterService';
import { generateReceiptBuffer } from '../utils/receiptFormatter.ts';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const STORAGE_KEY = 'pos:selectedPrinterAddress';

class QzPrinterBackend implements PrinterService {
  private address: PrinterAddress | undefined;
  private connected = false;
  private qz: any | null = null;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.address = JSON.parse(raw) as PrinterAddress;
    } catch {}
  }

  private async ensureQzConnected(): Promise<void> {
    if (this.qz && this.qz.websocket && this.qz.websocket.isActive && this.qz.websocket.isActive()) {
      this.connected = true;
      return;
    }

    try {
      this.qz = (typeof window !== 'undefined' && (window as any).qz) ? (window as any).qz : null;
      if (!this.qz) {
        try {
          const mod = await import('qz-tray');
          this.qz = mod?.default ?? mod;
        } catch (err) {
          console.warn('[QZ] qz-tray not available:', err);
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

      if (this.qz.websocket && this.qz.websocket.connect) {
        await this.qz.websocket.connect();
        this.connected = !!(this.qz.websocket && this.qz.websocket.isActive && this.qz.websocket.isActive());
      }
    } catch (e) {
      console.warn('[QZ] connect failed', e);
      this.connected = false;
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    try { await this.ensureQzConnected(); } catch {}
    return { isConnected: this.connected, address: this.address };
  }

  async setAddress(addr: PrinterAddress): Promise<void> {
    this.address = addr;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(addr)); } catch {}
  }

  private toHex(buf: Uint8Array): string {
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async listPrinters(): Promise<string[]> {
    try {
      await this.ensureQzConnected();
      if (!this.qz) return [];
      if (this.qz.printers && typeof this.qz.printers.find === 'function') {
        const list = await this.qz.printers.find();
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (e) {
      console.warn('[QZ] listPrinters failed', e);
      return [];
    }
  }

  async printOrder(order: PrintableOrder): Promise<PrintResult> {
    try {
      const raw = generateReceiptBuffer(order as any) as unknown;
      const u8: Uint8Array = raw instanceof Uint8Array ? raw : new Uint8Array(raw as any);

      await this.ensureQzConnected();
      if (this.connected && this.qz) {
        try {
          const printerName = this.address?.printerName;
          if (!printerName) return { success: false, message: 'Please select printer' };
          const qz = this.qz;
          const hex = this.toHex(u8);
          const data = [{ type: 'raw', format: 'hex', data: hex }];
          const config = qz.configs.create(printerName);
          await qz.print(config, data);
          return { success: true, message: 'Printed via QZ Tray' };
        } catch (e: any) {
          console.error('[QZ] print failed', e);
        }
      }
      console.debug('[QZ] Simulated print bytes length:', u8.length);
      return { success: true, message: 'Simulated print success (qz fallback)' };
    } catch (e: any) {
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

class PrinterManager implements PrinterService {
  private qz = new QzPrinterBackend();
  private net = networkPrinterService;
  private address: PrinterAddress | undefined;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.address = JSON.parse(raw) as PrinterAddress;
    } catch {}
  }

  private isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|Mobile/i.test(ua);
  }

  private selectedBackend(): PrinterService {
    const proto = this.address?.protocol;
    if (proto === 'tcp') return this.net;
    if (proto === 'qz') return this.qz;
    return this.isMobileDevice() ? this.net : this.qz;
  }

  async getStatus(): Promise<PrinterStatus> {
    try {
      const backend = this.selectedBackend();
      return backend.getStatus();
    } catch (e: any) {
      return { isConnected: false, lastError: e?.message ?? String(e) };
    }
  }

  async setAddress(addr: PrinterAddress): Promise<void> {
    this.address = addr;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(addr)); } catch {}
    // keep both backends in sync
    await Promise.all([this.qz.setAddress(addr).catch(() => {}), this.net.setAddress(addr).catch(() => {})]);
  }

  // Load saved settings from Firestore (preferred) or fallback to localStorage.
  async loadSavedPrinterSettings(): Promise<void> {
    try {
      // Try Firestore document: printerSettings/default
      const ref = doc(db, 'printerSettings', 'default');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as any;
        const addr: PrinterAddress = {
          protocol: data.protocol ?? 'tcp',
          printerName: data.printerName,
          ip: data.ip,
          port: data.port,
        };
        this.address = addr;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(addr)); } catch {}
        // sync backends
        await Promise.all([this.qz.setAddress(addr).catch(() => {}), this.net.setAddress(addr).catch(() => {})]);
        console.log('Firebase printer settings loaded and applied', addr);
        return;
      }
    } catch (e) {
      console.warn('Failed to load printer settings from Firestore, falling back to localStorage', e);
    }

    // Fallback: localStorage was already read in constructor, but ensure backends are synced
    if (this.address) {
      try { await Promise.all([this.qz.setAddress(this.address).catch(() => {}), this.net.setAddress(this.address).catch(() => {})]); } catch {}
      console.log('Loaded printer settings from localStorage', this.address);
    }
  }

  async listPrinters(): Promise<string[]> {
    try { return await this.qz.listPrinters?.() ?? []; } catch { return []; }
  }

  async printOrder(order: PrintableOrder): Promise<PrintResult> {
    const backend = this.selectedBackend();
    return backend.printOrder(order);
  }

  async testConnection(): Promise<PrintResult> {
    const backend = this.selectedBackend();
    return backend.testConnection();
  }
}

export const printerService: PrinterService = new PrinterManager();
export default printerService;
