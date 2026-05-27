import { createContext, useContext, type ReactNode } from "react";
import {
  useBluetoothPrinter,
  type BluetoothPrinterHook,
} from "../hooks/useBluetoothPrinter";

const PrinterContext = createContext<BluetoothPrinterHook | null>(null);

export function PrinterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const printer = useBluetoothPrinter();

  return (
    <PrinterContext.Provider value={printer}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const context = useContext(PrinterContext);

  if (!context) {
    throw new Error(
      "usePrinter must be used within a PrinterProvider"
    );
  }

  return context;
}