// Printer-related shared types for POS

export type PrinterProtocol = 'tcp' | 'usb' | 'qz' | 'simulator';

export interface PrinterAddress {
  protocol: PrinterProtocol;
  ip?: string; // for tcp
  port?: number; // for tcp
  usbPath?: string; // for usb
  // Optional human-readable printer name (QZ / OS printer name)
  printerName?: string;
}

export interface PrinterStatus {
  isConnected: boolean;
  address?: PrinterAddress;
  lastError?: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
}

export interface PrintableOrder {
  id: string;
  orderNumber?: number;
  items: Array<{ name: string; qty: number; unitPrice: number }>;
  totalAmount: number;
  amountReceived?: number;
  balanceAmount?: number;
  paymentMethod?: 'cash' | 'upi' | string;
  createdAt?: number | string;
}

export interface PrinterService {
  getStatus(): Promise<PrinterStatus>;
  setAddress(addr: PrinterAddress): Promise<void>;
  printOrder(order: PrintableOrder): Promise<PrintResult>;
  testConnection(): Promise<PrintResult>;
  listPrinters?(): Promise<string[]>;
}
