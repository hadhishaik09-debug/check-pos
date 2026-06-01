import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface PrinterSettings {
    protocol?: string;
    printerName?: string;
    ip?: string;
    port?: number;
    printerId?: string;
}

export async function savePrinterSettings(printer: PrinterSettings) {
    try {
        console.log('savePrinterSettings: saving to firestore', printer);
        await setDoc(
            doc(db, 'printerSettings', 'default'),
            {
                protocol: printer.protocol ?? null,
                printerName: printer.printerName ?? null,
                ip: printer.ip ?? null,
                port: printer.port ?? null,
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );
        console.log('Printer settings saved successfully to printerSettings/default');
    } catch (error) {
        console.error('Failed to save printer settings to printerSettings/default:', error);
        throw error;
    }
}

export async function getPrinterSettings() {
    try {
        const snapshot = await getDoc(doc(db, 'printerSettings', 'default'));
        if (!snapshot.exists()) return null;
        return snapshot.data();
    } catch (error) {
        console.error('Failed to fetch printer settings from printerSettings/default:', error);
        return null;
    }
}