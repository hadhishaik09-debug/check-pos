/**
 * Canonical printer exports
 * - Exposes a single place to import printer utilities and types
 * - Keeps backward-compat re-exports for existing modules to avoid breaking changes
 */
import * as types from './types';
import { generateReceipt, generateReceiptBuffer } from '../utils/receiptFormatter';
import { formatOrderForPrinter } from '../lib/printer-utils';
import printerService from './service';

export { types };
export { generateReceipt, generateReceiptBuffer };

/**
 * Legacy formatter kept for compatibility. Prefer `generateReceipt`.
 */
export { formatOrderForPrinter };

export { printerService };

export type { PrinterAddress, PrinterStatus, PrintableOrder, PrintResult } from './types';
