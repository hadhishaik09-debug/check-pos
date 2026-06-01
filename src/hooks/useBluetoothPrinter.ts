import {
  savePrinterSettings,
  getPrinterSettings,
} from "@/lib/printerSettings";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

export type PrinterStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

export interface BluetoothPrinterHook {
  status: PrinterStatus;

  deviceName: string | null;

  error: string | null;

  connect: () => Promise<void>;

  disconnect: () => void;

  printData: (
    data: Uint8Array,
  ) => Promise<void>;
}

const PRINTER_SERVICE_UUID =
  "0000ff00-0000-1000-8000-00805f9b34fb";

const PRINTER_CHARACTERISTIC_UUID =
  "0000ff02-0000-1000-8000-00805f9b34fb";

export function useBluetoothPrinter(): BluetoothPrinterHook {
  const [status, setStatus] =
    useState<PrinterStatus>("idle");

  const [deviceName, setDeviceName] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [savedPrinter, setSavedPrinter] =
    useState<any>(null);

  const deviceRef = useRef<any>(null);

  const characteristicRef = useRef<any>(null);

  // ✅ LOAD SAVED PRINTER
  useEffect(() => {
    async function loadSavedPrinter() {
      const printer =
        await getPrinterSettings();

      if (printer) {
        setSavedPrinter(printer);

        console.log(
          "Saved Printer:",
          printer,
        );
      }
    }

    loadSavedPrinter();
  }, []);

  const disconnect = useCallback(() => {
    try {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }

      deviceRef.current = null;

      characteristicRef.current = null;

      setDeviceName(null);

      setStatus("disconnected");
    } catch (err) {
      console.error(
        "Disconnect Error:",
        err,
      );
    }
  }, []);

  const connect = useCallback(async () => {
    const bluetooth =
      (navigator as any).bluetooth;

    if (!bluetooth) {
      setError(
        "Web Bluetooth is not supported in this browser.",
      );

      setStatus("error");

      return;
    }

    try {
      setStatus("connecting");

      setError(null);

      const device =
        await bluetooth.requestDevice({
          filters: [
            {
              services: [
                PRINTER_SERVICE_UUID,
              ],
            },
          ],

          optionalServices: [
            PRINTER_SERVICE_UUID,
          ],
        });

      deviceRef.current = device;

      setDeviceName(
        device.name || "Thermal Printer",
      );

      device.addEventListener(
        "gattserverdisconnected",
        () => {
          setStatus("disconnected");

          characteristicRef.current = null;

          console.log(
            "Printer disconnected",
          );
        },
      );

      const server =
        await device.gatt?.connect();

      const service =
        await server?.getPrimaryService(
          PRINTER_SERVICE_UUID,
        );

      const characteristic =
        await service?.getCharacteristic(
          PRINTER_CHARACTERISTIC_UUID,
        );

      if (!characteristic) {
        throw new Error(
          "Could not find printer characteristic.",
        );
      }

      characteristicRef.current =
        characteristic;

      // ✅ SAVE PRINTER TO FIREBASE
      await savePrinterSettings({
        protocol: 'bluetooth',
        printerId: device.id,
        printerName: device.name || 'Thermal Printer',
      });

      console.log(
        "Printer saved to Firebase",
      );

      setStatus("connected");
    } catch (err: any) {
      console.error(
        "Bluetooth Connection Error:",
        err,
      );

      setError(
        err.message ||
        "Failed to connect to printer.",
      );

      setStatus("error");

      deviceRef.current = null;

      characteristicRef.current = null;
    }
  }, []);

  const printData = useCallback(
    async (data: Uint8Array) => {
      if (!characteristicRef.current) {
        throw new Error(
          "Printer not connected.",
        );
      }

      try {
        const CHUNK_SIZE = 512;

        for (
          let i = 0;
          i < data.length;
          i += CHUNK_SIZE
        ) {
          const chunk = data.slice(
            i,
            i + CHUNK_SIZE,
          );

          await characteristicRef.current.writeValue(
            chunk,
          );
        }

        console.log(
          "Receipt printed successfully",
        );
      } catch (err: any) {
        console.error(
          "Print Error:",
          err,
        );

        setError(
          "Printing failed: " +
          (err.message ||
            "Unknown error"),
        );

        throw err;
      }
    },
    [],
  );

  return {
    status,

    deviceName,

    error,

    connect,

    disconnect,

    printData,
  };
}