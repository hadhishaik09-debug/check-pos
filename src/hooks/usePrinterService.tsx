import { useEffect, useState, useCallback } from 'react';

export interface PrinterStatus {
  isConnected: boolean;
  ip: string;
  port: number;
}

export default function usePrinterService() {
  const [status, setStatus] = useState<PrinterStatus>({ isConnected: false, ip: '192.168.1.100', port: 9100 });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const load = async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          const s = await (window as any).electronAPI.getPrinterStatus();
          setStatus(s);
          unsub = (window as any).electronAPI.onPrinterStatusChange((st: PrinterStatus) => setStatus(st));
        } catch (e) {
          console.warn('Failed to load printer status', e);
        }
      }
    };

    load();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const setPrinterAddress = useCallback(async (ip: string, port: number) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return await (window as any).electronAPI.setPrinterAddress(ip, port);
    }
    return { success: false, message: 'No electron API' };
  }, []);

  const testPrinterConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return await (window as any).electronAPI.testPrinterConnection();
    }
    return { success: false, message: 'No electron API' };
  }, []);

  const printOrder = useCallback(async (order: any) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return await (window as any).electronAPI.printOrder(order);
    }
    return { success: false, message: 'No electron API' };
  }, []);

  return { status, setPrinterAddress, testPrinterConnection, printOrder };
}
