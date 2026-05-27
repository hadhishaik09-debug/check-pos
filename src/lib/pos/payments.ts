/**
 * Payment calculation and validation utilities.
 * Shared business logic for cash and online payment methods.
 */

const PAISE_MULTIPLIER = 100;

export type PaymentType = "cash" | "upi";
export type PaymentMode = "exact" | "manual";

export interface PaymentCalculation {
  totalAmount: number;
  amountReceived: number;
  balanceAmount: number;
  remainingAmount: number;
  change: number;
  isValid: boolean;
  isExact: boolean;
  isUnderpaid: boolean;
  isOverpaid: boolean;
  validationMessage?: string;
}

export interface OrderValidation {
  isValid: boolean;
  errors: string[];
}

function toPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * PAISE_MULTIPLIER);
}

function fromPaise(amountInPaise: number): number {
  if (!Number.isFinite(amountInPaise)) return 0;
  return Math.round(amountInPaise) / PAISE_MULTIPLIER;
}

export function sanitizeAmount(amount: number): number {
  return fromPaise(toPaise(amount));
}

/**
 * Parse and validate amount string input.
 * Handles empty strings, symbols, invalid numbers, and negative values.
 */
export function parseAmount(input: string): number {
  if (!input || input.trim() === "") return 0;

  const trimmedInput = input.trim();
  if (trimmedInput.includes("-")) return 0;

  const normalizedInput = trimmedInput.replace(/[₹,\s]/g, "");
  if (!/^\d*(\.\d*)?$/.test(normalizedInput)) return 0;

  const parsed = Number.parseFloat(normalizedInput);

  if (Number.isNaN(parsed) || parsed < 0) return 0;

  return sanitizeAmount(parsed);
}

/**
 * Calculate payment details for a transaction using paise-based math.
 */
export function calculatePayment(
  totalAmount: number,
  mode: PaymentMode,
  manualAmountStr: string,
): PaymentCalculation {
  const safeTotalAmount = sanitizeAmount(totalAmount);
  const totalInPaise = toPaise(safeTotalAmount);
  const manualAmount = parseAmount(manualAmountStr);
  const manualAmountInPaise = toPaise(manualAmount);

  if (mode === "exact") {
    return {
      totalAmount: safeTotalAmount,
      amountReceived: safeTotalAmount,
      balanceAmount: 0,
      remainingAmount: 0,
      change: 0,
      isValid: true,
      isExact: true,
      isUnderpaid: false,
      isOverpaid: false,
    };
  }

  if (manualAmountStr.trim().length === 0) {
    return {
      totalAmount: safeTotalAmount,
      amountReceived: 0,
      balanceAmount: 0,
      remainingAmount: safeTotalAmount,
      change: 0,
      isValid: false,
      isExact: false,
      isUnderpaid: true,
      isOverpaid: false,
      validationMessage: "Please enter an amount",
    };
  }

  if (manualAmountInPaise < totalInPaise) {
    const remainingInPaise = totalInPaise - manualAmountInPaise;
    return {
      totalAmount: safeTotalAmount,
      amountReceived: manualAmount,
      balanceAmount: fromPaise(-remainingInPaise),
      remainingAmount: fromPaise(remainingInPaise),
      change: 0,
      isValid: false,
      isExact: false,
      isUnderpaid: true,
      isOverpaid: false,
      validationMessage: `Need ${formatIndianRupees(fromPaise(remainingInPaise))} more`,
    };
  }

  const balanceInPaise = manualAmountInPaise - totalInPaise;
  const balanceAmount = fromPaise(balanceInPaise);

  return {
    totalAmount: safeTotalAmount,
    amountReceived: manualAmount,
    balanceAmount,
    remainingAmount: 0,
    change: balanceAmount,
    isValid: true,
    isExact: balanceInPaise === 0,
    isUnderpaid: false,
    isOverpaid: balanceInPaise > 0,
  };
}

export function canProcessPayment(
  mode: PaymentMode,
  manualAmountStr: string,
  totalAmount: number,
): boolean {
  return calculatePayment(totalAmount, mode, manualAmountStr).isValid;
}

export function formatIndianRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(sanitizeAmount(amount));
}

export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function getPaymentModeLabel(mode: PaymentMode, paymentType: PaymentType): string {
  if (mode === "exact") {
    return paymentType === "cash"
      ? "Customer pays the exact amount."
      : "Customer pays the exact amount online.";
  }

  return paymentType === "cash" ? "Enter cash amount" : "Enter online payment amount";
}

export function getAmountReceivedLabel(paymentType: PaymentType): string {
  return paymentType === "cash" ? "Cash Received" : "Payment Received";
}

export function getBalanceLabel(paymentType: PaymentType, payment: PaymentCalculation): string {
  if (payment.isUnderpaid) {
    return "Balance Due";
  }

  if (payment.isOverpaid) {
    return paymentType === "cash" ? "Change" : "Balance";
  }

  return paymentType === "cash" ? "Change" : "Balance";
}

export function validateOrder(
  totalAmount: number,
  paymentType: PaymentType,
  paymentMode: PaymentMode,
  manualAmountStr: string,
): OrderValidation {
  const errors: string[] = [];

  if (sanitizeAmount(totalAmount) <= 0) {
    errors.push("Cart is empty or total is invalid");
  }

  const payment = calculatePayment(totalAmount, paymentMode, manualAmountStr);
  if (!payment.isValid && payment.validationMessage) {
    errors.push(payment.validationMessage);
  }

  if (paymentType !== "cash" && paymentType !== "upi") {
    errors.push("Unsupported payment type");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
