import { collection, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Minus, Plus, Printer, Receipt, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, getBillingPrice, PLACEHOLDER_IMAGE } from "@/lib/pos/menu";
import { usePos, type Order } from "@/lib/pos/store";
import {
  calculatePayment,
  canProcessPayment,
  formatIndianRupees,
  getAmountReceivedLabel,
  getBalanceLabel,
  getPaymentModeLabel,
  sanitizeAmount,
  type PaymentMode,
} from "@/lib/pos/payments";
import { Receipt as PrintReceipt } from "./Receipt";
import { printerService } from "../../printer/service";

type Payment = "cash" | "upi";

interface PrinterStatus {
  isConnected: boolean;
  ip: string;
  port: number;
}

export function CartPanel() {
  const { cart, total, profit, itemCount, increment, decrement, remove, clear, buildTempOrder, commitOrder } = usePos();

  const [payment, setPayment] = useState<Payment>("cash");
  const [cashMode, setCashMode] = useState<PaymentMode>("exact");
  const [manualCashStr, setManualCashStr] = useState("");
  const [onlineMode, setOnlineMode] = useState<PaymentMode>("exact");
  const [manualOnlineStr, setManualOnlineStr] = useState("");

  const [tempOrder, setTempOrder] = useState<Order | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [billGenerated, setBillGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({ isConnected: false, ip: "192.168.1.100", port: 9100 });

  const cartSignature = useMemo(
    () => cart.map((line) => `${line.item.id}:${line.item.name}:${getBillingPrice(line.item)}:${line.quantity}`).join("|"),
    [cart],
  );

  const resetOrderState = useCallback(() => {
    setShowBill(false);
    setBillGenerated(false);
    setTempOrder(null);
    setManualCashStr("");
    setManualOnlineStr("");
    setCashMode("exact");
    setOnlineMode("exact");
  }, [setShowBill, setBillGenerated, setTempOrder, setManualCashStr, setManualOnlineStr, setCashMode, setOnlineMode]);

  useEffect(() => {
    // When cart becomes empty and we're not actively processing a print/save,
    // reset bill/receipt state. Do NOT reset while printing (isProcessing=true)
    // because commitOrder() clears the cart before the printing flow completes.
    if (cart.length === 0 && !isProcessing) {
      resetOrderState();
    }
  }, [cart.length, isProcessing, resetOrderState]);

  useEffect(() => {
    // When new items are added to cart, ensure the Generate Bill button and
    // preview are reset so the new order starts fresh.
    if (cart.length > 0) {
      setBillGenerated(false);
      setShowBill(false);
      setTempOrder(null);
    }
  }, [cart.length]);

  const handleClear = useCallback(() => {
    clear();
    // ensure all bill/preview state is reset when user clears the cart
    resetOrderState();
  }, [clear, resetOrderState]);

  // Load initial printer status and subscribe to updates (desktop only)
  useEffect(() => {
    const loadPrinterStatus = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).electronAPI) {
          const status = await (window as any).electronAPI.getPrinterStatus();
          setPrinterStatus(status);
        } else {
          const s = await printerService.getStatus();
          setPrinterStatus({ isConnected: !!s.isConnected, ip: s.address?.ip ?? s.address?.printerName ?? 'unknown', port: s.address?.port ?? 0 });
        }
      } catch (e) {
        console.warn("Failed to load printer status", e);
      }
    };

    loadPrinterStatus();

    let unsubscribe: (() => void) | null = null;
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      unsubscribe = (window as any).electronAPI.onPrinterStatusChange((status: PrinterStatus) => {
        setPrinterStatus(status);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const cashPayment = useMemo(() => calculatePayment(total, cashMode, manualCashStr), [total, cashMode, manualCashStr]);
  const onlinePayment = useMemo(() => calculatePayment(total, onlineMode, manualOnlineStr), [total, onlineMode, manualOnlineStr]);

  const paymentState = useMemo(
    () => ({
      cash: { mode: cashMode, manualAmountStr: manualCashStr, details: cashPayment },
      upi: { mode: onlineMode, manualAmountStr: manualOnlineStr, details: onlinePayment },
    }),
    [cashMode, manualCashStr, cashPayment, onlineMode, manualOnlineStr, onlinePayment],
  );

  const activePaymentState = paymentState[payment];

  useEffect(() => {
    if (!tempOrder) return;
    const currentAmountReceived = sanitizeAmount(activePaymentState.details.amountReceived);
    const currentBalanceAmount = sanitizeAmount(activePaymentState.details.balanceAmount);

    if (
      tempOrder.paymentMethod !== payment ||
      tempOrder.items.map((line) => `${line.item.id}:${line.item.name}:${getBillingPrice(line.item)}:${line.quantity}`).join("|") !== cartSignature ||
      sanitizeAmount(tempOrder.totalAmount) !== sanitizeAmount(total) ||
      sanitizeAmount(tempOrder.amountReceived ?? 0) !== currentAmountReceived ||
      sanitizeAmount(tempOrder.balanceAmount ?? 0) !== currentBalanceAmount
    ) {
      setTempOrder(null);
    }
  }, [activePaymentState.details.amountReceived, activePaymentState.details.balanceAmount, cartSignature, payment, tempOrder, total]);

  const canSubmit = useMemo(() => {
    if (cart.length === 0) return false;
    if (sanitizeAmount(total) <= 0) return false;
    return canProcessPayment(activePaymentState.mode, activePaymentState.manualAmountStr, total);
  }, [activePaymentState.manualAmountStr, activePaymentState.mode, cart.length, total]);

  const handleGenerateBill = useCallback(() => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!canSubmit) {
      toast.error("Invalid payment details");
      return;
    }

    const activeDetails = activePaymentState.details;
    const amountReceived = sanitizeAmount(activeDetails.amountReceived);
    const balanceAmount = sanitizeAmount(activeDetails.balanceAmount);

    const paymentDetails = {
      paymentMethod: payment,
      paymentMode: activePaymentState.mode,
      amountReceived,
      balanceAmount,
      ...(payment === "cash" && { cashReceived: amountReceived }),
      ...(payment === "upi" && { paymentReceived: amountReceived }),
      change: balanceAmount,
      ...(payment === "upi" && { tip: balanceAmount }),
    } as const;

    const order = buildTempOrder(paymentDetails);
    setTempOrder(order);
    setShowBill(true);
    setBillGenerated(true);
    toast.success(`Bill ${order.id} generated`, { description: `Preview ready — click Print to finalize.` });
  }, [cart.length, canSubmit, activePaymentState, payment, buildTempOrder]);

  const handlePrintBill = useCallback(async () => {
    if (!tempOrder) {
      toast.error("No bill generated. Click Generate Bill first.");
      return;
    }

    setIsProcessing(true);
    try {
      const txResult = await runTransaction(db, async (tx) => {
        // Use date-based daily counters. Document ID is YYYY-MM-DD
        const now = new Date();
        const dateKey = now.toISOString().slice(0, 10); // e.g. 2026-05-31

        const counterRef = doc(db, "counters", dateKey);
        const counterSnap = await tx.get(counterRef);

        let next = 1;
        if (!counterSnap.exists()) {
          // initialize today's counter to 1
          tx.set(counterRef, { lastOrderNumber: next });
        } else {
          const data = counterSnap.data() as { lastOrderNumber?: number };
          const last = data?.lastOrderNumber ?? 0;
          next = last + 1;
          tx.update(counterRef, { lastOrderNumber: next });
        }

        const formattedId = `ORD-${String(next).padStart(4, "0")}`;

        const orderPayload = {
          ...tempOrder,
          id: formattedId,
          orderNumber: next,
          orderDateKey: dateKey,
          dailyOrderNumber: next,
          createdAt: serverTimestamp(),
        } as any;

        const ordersCol = collection(db, "orders");
        const orderRef = doc(ordersCol);
        tx.set(orderRef, orderPayload);

        return { next, orderId: orderRef.id, dateKey };
      });

      const updatedOrder = tempOrder
        ? {
            ...tempOrder,
            id: `ORD-${String(txResult.next).padStart(4, "0")}`,
            orderNumber: txResult.next,
            orderDateKey: txResult.dateKey,
            dailyOrderNumber: txResult.next,
            createdAt: Date.now(),
          }
        : null;

      if (updatedOrder) {
        setTempOrder(updatedOrder);
        commitOrder(updatedOrder);

        // Desktop: print via electron IPC; Mobile/Tablet: only save to Firebase
        if (typeof window !== "undefined" && (window as any).electronAPI) {
          try {
            const result = await (window as any).electronAPI.printOrder(updatedOrder);
            if (result && result.success) {
              // Mark printed in Firestore
              try {
                await runTransaction(db, async (tx) => {
                  const orderDocRef = doc(db, "orders", txResult.orderId);
                  tx.update(orderDocRef, { printedByDesktop: true, printedAt: serverTimestamp() });
                });
              } catch (e) {
                console.warn("Failed to mark printed in Firestore:", e);
              }

              toast.success(`Order #${txResult.next} printed successfully`);

              setTimeout(() => {
                // ensure a consistent reset path after successful print/save
                resetOrderState();
              }, 500);
            } else {
              toast.error(`Print failed: ${result?.message ?? "Unknown error"}`);
            }
          } catch (e) {
            console.error("Print invocation failed:", e);
            toast.error("Print failed: " + (e instanceof Error ? e.message : String(e)));
          }
        } else {
          // Web clients: attempt to print via QZ Tray (printerService) if available.
          try {
            const printable = {
              id: updatedOrder.id,
              orderNumber: updatedOrder.orderNumber,
              items: updatedOrder.items.map((l) => ({ name: l.item.name, qty: l.quantity, unitPrice: getBillingPrice(l.item) })),
              totalAmount: updatedOrder.totalAmount,
              amountReceived: updatedOrder.amountReceived,
              balanceAmount: updatedOrder.balanceAmount,
              paymentMethod: updatedOrder.paymentMethod,
              createdAt: updatedOrder.createdAt,
            };

            const res = await printerService.printOrder(printable as any);
            if (res.success) {
              try {
                await runTransaction(db, async (tx) => {
                  const orderDocRef = doc(db, "orders", txResult.orderId);
                  tx.update(orderDocRef, { printedByQZ: true, printedAt: serverTimestamp() });
                });
              } catch (e) {
                console.warn("Failed to mark printed in Firestore:", e);
              }

              toast.success(`Order #${txResult.next} printed successfully`);

              setTimeout(() => {
                // ensure a consistent reset path after successful print/save
                resetOrderState();
              }, 500);
            } else {
              toast.error(`Print failed: ${res.message ?? 'Unknown error'}`);
              // keep the order saved; user can retry from desktop
            }
          } catch (e) {
            console.error('Print via printerService failed:', e);
            toast.error('Print failed: ' + (e instanceof Error ? e.message : String(e)));
          }
        }
      }
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to process order: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  }, [tempOrder, commitOrder, clear, manualCashStr, manualOnlineStr, resetOrderState]);

  // UI helpers
  const mobileOnly = "md:hidden";
  const desktopOnly = "hidden md:flex";

  return (
    <aside className="flex flex-col border-t border-border bg-surface w-full min-h-screen">
      <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-surface-alt text-primary-text flex-shrink-0">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">Current Order</h2>
            <p className="text-xs font-medium text-text-secondary tabular">{itemCount} {itemCount === 1 ? "item" : "items"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={handleClear} className="flex h-8 sm:h-9 items-center gap-1 rounded-lg px-2 sm:px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-alt hover:text-foreground" title="Clear cart">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-3 sm:px-6 sm:py-4 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <EmptyCart />
        ) : (
          <motion.ul layout className="flex flex-col gap-2 sm:gap-3">
            <AnimatePresence initial={false}>
              {cart.map((line) => (
                <motion.li key={line.item.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl bg-surface-alt p-2 sm:p-3">
                  <img src={line.item.image || PLACEHOLDER_IMAGE} alt={line.item.name} className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 rounded-lg object-cover ring-1 ring-border" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold text-foreground">{line.item.name}</p>
                    <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 gap-y-0.5">
                      <p className="text-xs font-semibold text-primary-text tabular">{formatMoney(getBillingPrice(line.item))}</p>
                      {line.item.isPriceOverride && line.item.originalPrice !== undefined && (
                        <p className="text-[10px] sm:text-[11px] font-medium text-text-secondary line-through tabular">{formatMoney(line.item.originalPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface p-0.5 sm:p-1 shadow-[var(--shadow-soft-sm)] flex-shrink-0">
                    <button onClick={() => decrement(line.item.id)} aria-label="Decrease" className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-alt"><Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></button>
                    <span className="w-5 sm:w-7 text-center text-xs sm:text-sm font-bold text-foreground tabular">{line.quantity}</span>
                    <button onClick={() => increment(line.item.id)} aria-label="Increase" className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-accent"><Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></button>
                  </div>
                  <button onClick={() => remove(line.item.id)} aria-label="Remove" className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface hover:text-destructive flex-shrink-0"><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <div className="border-t border-border bg-surface px-3 py-3 sm:px-6 sm:py-4 pb-44 sm:pb-44">
        {/* Printer status card removed - Printer Settings button moved to header */}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Payment Method</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <PayBtn active={payment === "cash"} onClick={() => setPayment("cash")} icon={<Banknote className="h-4 w-4" />} label="Cash" />
          <PayBtn active={payment === "upi"} onClick={() => setPayment("upi")} icon={<Printer className="h-4 w-4" />} label="UPI" />
        </div>

        {/* Payment panels omitted for brevity (keeps original UI) */}
        <div className="space-y-1 mb-4">
          <Row label="Profit" value={formatIndianRupees(profit)} muted />
          {payment === "cash" && (
            <>
              <Row label={getAmountReceivedLabel("cash")} value={formatIndianRupees(cashPayment.amountReceived)} muted />
              <Row label={getBalanceLabel("cash", cashPayment)} value={formatIndianRupees(cashPayment.isUnderpaid ? cashPayment.remainingAmount : cashPayment.balanceAmount)} highlight={cashPayment.isUnderpaid || cashPayment.isOverpaid} />
            </>
          )}
          {payment === "upi" && (
            <>
              <Row label={getAmountReceivedLabel("upi")} value={formatIndianRupees(onlinePayment.amountReceived)} muted />
              <Row label={getBalanceLabel("upi", onlinePayment)} value={formatIndianRupees(onlinePayment.isUnderpaid ? onlinePayment.remainingAmount : onlinePayment.balanceAmount)} highlight={onlinePayment.isUnderpaid || onlinePayment.isOverpaid} />
            </>
          )}

          <div className="flex items-end justify-between pt-2 border-t border-border">
            <span className="text-xs sm:text-sm font-semibold text-text-secondary">Total</span>
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-foreground tabular">{formatIndianRupees(total)}</span>
          </div>
        </div>

        {showBill && tempOrder && (
          <div className="mb-4 rounded-lg sm:rounded-xl bg-surface-alt p-2 sm:p-3 shadow-[var(--shadow-soft-sm)]">
            <div className="w-full">
              <PrintReceipt order={tempOrder} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {!billGenerated ? (
            <button onClick={handleGenerateBill} disabled={cart.length === 0 || isProcessing} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base">Generate Bill</button>
          ) : (
            <button onClick={handlePrintBill} disabled={cart.length === 0 || isProcessing || !printerStatus.isConnected} className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-300 text-white py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base flex items-center justify-center gap-2">
              {isProcessing ? (<><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Processing...</>) : (<><Printer className="h-4 w-4" />Print & Save Order</>)}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function PayBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex h-12 sm:h-14 items-center justify-center gap-2 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-200 ${active ? "border-primary bg-surface-alt text-primary-text shadow-[var(--shadow-soft-sm)]" : "border-border bg-surface text-text-secondary hover:text-foreground"}`}>
      {icon}
      {label}
    </button>
  );
}

function Row({ label, value, muted, highlight }: { label: string; value: string; muted?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs sm:text-sm">
      <span className={muted ? "text-text-secondary" : "text-foreground"}>{label}</span>
      <span className={`font-semibold tabular ${highlight ? "text-success-text" : muted ? "text-text-secondary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 sm:gap-3 py-10 text-center">
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-surface-alt"><Receipt className="h-8 w-8 sm:h-9 sm:w-9 text-text-secondary" /></div>
      <p className="text-xs sm:text-sm font-semibold text-foreground">Your cart is empty</p>
      <p className="max-w-[200px] text-xs leading-relaxed text-text-secondary">Select items from the menu to start an order.</p>
    </div>
  );
}

export default CartPanel;
