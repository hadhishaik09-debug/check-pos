import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export interface PrinterSettings {
    printerId: string;
    printerName: string;
}

export async function savePrinterSettings(
    printer: PrinterSettings,
) {
    try {
        await setDoc(
            doc(db, "settings", "printer"),
            {
                printerId: printer.printerId,

                printerName: printer.printerName,

                savedAt: serverTimestamp(),
            },
            {
                merge: true,
            },
        );

        console.log(
            "Printer settings saved successfully",
        );
    } catch (error) {
        console.error(
            "Failed to save printer settings:",
            error,
        );
    }
}

export async function getPrinterSettings() {
    try {
        const snapshot = await getDoc(
            doc(db, "settings", "printer"),
        );

        if (!snapshot.exists()) {
            return null;
        }

        return snapshot.data();
    } catch (error) {
        console.error(
            "Failed to fetch printer settings:",
            error,
        );

        return null;
    }
}