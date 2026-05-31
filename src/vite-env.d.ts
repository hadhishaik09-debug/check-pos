/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Order {
  id: string;
  orderNumber?: number;
  items: Array<{
    item: {
      id: string;
      name: string;
      image?: string;
      isPriceOverride?: boolean;
      originalPrice?: number;
    };
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  amountReceived?: number;
  balanceAmount?: number;
  paymentMethod: "cash" | "upi";
  createdAt?: number | any;
}

interface PrinterStatus {
  isConnected: boolean;
  ip: string;
  port: number;
}

interface ElectronAPI {
  printReceipt(escPosData: string): Promise<{ success: boolean; message?: string }>;
  getPrinterStatus(): Promise<PrinterStatus>;
  setPrinterAddress(ip: string, port: number): Promise<{ success: boolean; message?: string }>;
  testPrinterConnection(): Promise<{ success: boolean; message?: string }>;
  onPrinterStatusChange(callback: (status: PrinterStatus) => void): () => void;
  printOrder(order: Order): Promise<{ success: boolean; message?: string }>;
  getAppInfo(): Promise<{ version: string; name: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};