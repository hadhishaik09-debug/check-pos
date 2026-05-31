import { motion } from "framer-motion";
import {
    CircleDollarSign,
    Receipt,
    Smartphone,
    TrendingUp,
    Wallet,
    Calendar,
    ChevronDown,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { type Order } from "@/lib/pos/store";
import {
    filterOrdersByPeriod,
    calculateMetrics,
    formatIndianRupees,
    formatIndianNumber,
    formatDateIST,
    getDateRangeLabel,
    groupOrdersByDate,
    getSortedDateKeys,
    type ReportFilter,
    type ReportPeriod,
} from "@/lib/pos/reports";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    collection,
    getDocs,
    query,
    orderBy,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

function ReportsPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    const [filter, setFilter] = useState<ReportFilter>({ period: "daily" });
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    useEffect(() => {
        const loadOrders = async () => {
            try {
                const q = query(
                    collection(db, "orders"),
                    orderBy("createdAt", "desc")
                );

                const snapshot = await getDocs(q);

                const firebaseOrders: Order[] = snapshot.docs.map((doc) => {
                    const data = doc.data();

                    return {
id: data.id || `ORD-${data.orderNumber || "0000"}`,
                        items: data.items || [],

                        totalAmount: data.totalAmount || 0,

                        paymentMethod: data.paymentMethod || "cash",

                        profit: data.totalAmount || 0,

                        createdAt:
                            data.createdAt?.seconds
                                ? data.createdAt.seconds * 1000
                                : Date.now(),
                    } as Order;
                });

                setOrders(firebaseOrders);
            } catch (error) {
                console.error("Failed to load Firebase orders:", error);
            }
        };

        loadOrders();
    }, []);

    // Apply filter and calculate metrics
    const filteredOrders = useMemo(
        () => filterOrdersByPeriod(orders, filter),
        [orders, filter],
    );

    const metrics = useMemo(() => calculateMetrics(filteredOrders), [filteredOrders]);

    // Group orders by date for display
    const grouped = useMemo(() => groupOrdersByDate(filteredOrders), [filteredOrders]);
    const sortedDates = useMemo(() => getSortedDateKeys(grouped), [grouped]);

    // Format date heading with relative labels
    const formatDateHeading = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today.getTime() - 86400000);

        if (d.toDateString() === today.toDateString()) return "Today";
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

        return d.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
        });
    };

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Handle custom date range
    const handleApplyCustomRange = () => {
        if (customStart && customEnd) {
            const startDate = new Date(customStart).getTime();
            const endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);
            const endTime = endDate.getTime();

            setFilter({
                period: "custom",
                startDate,
                endDate: endTime,
            });
            setShowCustomRange(false);
        }
    };

    const handlePeriodChange = (period: ReportPeriod) => {
        setFilter({ period });
        setShowCustomRange(false);
    };

    const stats = [
        {
            label: "Total Sales",
            value: formatIndianRupees(metrics.totalSales),
            icon: CircleDollarSign,
            tint: "primary" as const,
            subtext: formatIndianNumber(metrics.totalOrders) + " orders",
        },
        {
            label: "Total Profit",
            value: formatIndianRupees(metrics.totalProfit),
            icon: TrendingUp,
            tint: "success" as const,
            subtext: metrics.profitMargin.toFixed(1) + "% margin",
        },
        {
            label: "Avg Order Value",
            value: formatIndianRupees(metrics.averageOrderValue),
            icon: CircleDollarSign,
            tint: "primary" as const,
            subtext: formatIndianNumber(metrics.totalOrders) + " orders",
        },
        {
            label: "Cash Sales",
            value: formatIndianNumber(metrics.paymentBreakdown.cash.count),
            icon: Wallet,
            tint: "neutral" as const,
            subtext: formatIndianRupees(metrics.paymentBreakdown.cash.amount),
        },
        {
            label: "UPI Sales",
            value: formatIndianNumber(metrics.paymentBreakdown.upi.count),
            icon: Smartphone,
            tint: "primary" as const,
            subtext: formatIndianRupees(metrics.paymentBreakdown.upi.amount),
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-32 md:pb-8">

            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="border-b border-border bg-surface/50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    <div className="mb-6">
                        <p className="text-sm font-medium text-text-secondary">Advanced Reporting</p>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Sales Dashboard</h1>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-11 gap-2"
                                    >
                                        <Calendar className="h-4 w-4" />
                                        <span>{getDateRangeLabel(filter)}</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    <DropdownMenuItem onClick={() => handlePeriodChange("daily")}>
                                        Daily Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePeriodChange("weekly")}>
                                        Weekly Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePeriodChange("monthly")}>
                                        Monthly Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePeriodChange("yearly")}>
                                        Yearly Report
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowCustomRange(!showCustomRange)}>
                                        Custom Range
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Quick stats */}
                        <div className="text-sm text-text-secondary">
                            {filteredOrders.length > 0
                                ? `${formatIndianNumber(filteredOrders.length)} orders • ${formatIndianRupees(metrics.totalSales)}`
                                : "No orders"}
                        </div>
                    </div>

                    {/* Custom Range Picker */}
                    {showCustomRange && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 flex flex-col gap-3 rounded-lg bg-surface p-4 sm:flex-row sm:items-end sm:gap-2"
                        >
                            <div className="flex-1">
                                <label className="text-xs font-medium text-text-secondary">Start Date</label>
                                <Input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium text-text-secondary">End Date</label>
                                <Input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                size="sm"
                                onClick={handleApplyCustomRange}
                                disabled={!customStart || !customEnd}
                            >
                                Apply
                            </Button>
                        </motion.div>
                    )}
                </div>

                {/* Main Content */}
                <div className="p-4 sm:p-6 lg:p-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {stats.map((s, i) => (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                                className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft-sm)] sm:p-6"
                            >
                                <div
                                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${s.tint === "primary"
                                        ? "bg-surface-alt text-primary-text"
                                        : s.tint === "success"
                                            ? "bg-[oklch(0.95_0.07_145)] text-success-text"
                                            : "bg-surface-alt text-foreground"
                                        }`}
                                >
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    {s.label}
                                </p>
                                <p className="mt-1 text-xl font-bold tracking-tight text-foreground tabular sm:text-2xl">
                                    {s.value}
                                </p>
                                {s.subtext && (
                                    <p className="mt-1 text-xs font-medium text-text-secondary tabular">
                                        {s.subtext}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Detailed Reports Section */}
                    <section className="mt-10">
                        <h2 className="mb-4 text-lg font-semibold text-foreground">Orders</h2>

                        {filteredOrders.length === 0 ? (
                            <div className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-soft-sm)]">
                                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
                                        <Receipt className="h-7 w-7 text-text-secondary" />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">No orders found</p>
                                    <p className="text-xs text-text-secondary">
                                        Try adjusting your filter period.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedDates.map((dateKey) => {
                                    const dayOrders = grouped[dateKey];
                                    const daySales = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
                                    const dayProfit = dayOrders.reduce((s, o) => s + o.profit, 0);

                                    return (
                                        <div key={dateKey}>
                                            <div className="mb-3 flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-end">
                                                <h3 className="text-sm font-bold text-foreground">
                                                    {formatDateHeading(dateKey)}
                                                </h3>
                                                <div className="flex flex-wrap gap-4 text-xs font-medium text-text-secondary">
                                                    <span className="tabular">
                                                        {formatIndianNumber(dayOrders.length)} {dayOrders.length === 1 ? "order" : "orders"}
                                                    </span>
                                                    <span className="tabular">
                                                        {formatIndianRupees(daySales)} sales
                                                    </span>
                                                    <span className="tabular text-success-text">
                                                        {formatIndianRupees(dayProfit)} profit
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto rounded-2xl bg-surface shadow-[var(--shadow-soft-sm)]">
                                                <table className="min-w-[720px] w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                                            <th className="px-4 py-3 sm:px-6">Order ID</th>
                                                            <th className="px-4 py-3 sm:px-6">Time</th>
                                                            <th className="px-4 py-3 sm:px-6">Items</th>
                                                            <th className="px-4 py-3 sm:px-6">Method</th>
                                                            <th className="px-4 py-3 sm:px-6 text-right">Profit</th>
                                                            <th className="px-4 py-3 sm:px-6 text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dayOrders.map((o) => (
                                                            <tr
                                                                key={o.id}
                                                                className="border-b border-border last:border-0 hover:bg-surface-alt/50 transition-colors"
                                                            >
                                                                <td className="px-4 py-4 font-semibold text-foreground tabular sm:px-6">
                                                                    {o.id}
                                                                </td>
                                                                <td className="px-4 py-4 text-text-secondary tabular sm:px-6">
                                                                    {formatTime(o.createdAt)}
                                                                </td>
                                                                <td className="px-4 py-4 text-text-secondary sm:px-6">
                                                                    {o.items.reduce((s, l) => s + l.quantity, 0)} items
                                                                </td>
                                                                <td className="px-4 py-4 sm:px-6">
                                                                    <span className="inline-flex h-6 items-center rounded-full bg-surface-alt px-2.5 text-xs font-semibold text-foreground">
                                                                        {o.paymentMethod === "cash"
                                                                            ? "Cash"
                                                                            : o.paymentMethod === "upi"
                                                                                ? "UPI"
                                                                                : o.paymentMethod === "card"
                                                                                    ? "Card"
                                                                                    : "Other"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-right text-success-text tabular sm:px-6">
                                                                    {formatIndianRupees(o.profit)}
                                                                </td>
                                                                <td className="px-4 py-4 text-right font-bold text-foreground tabular sm:px-6">
                                                                    {formatIndianRupees(o.totalAmount)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Payment Method Breakdown */}
                    {filteredOrders.length > 0 && (
                        <section className="mt-10">
                            <h2 className="mb-4 text-lg font-semibold text-foreground">Payment Breakdown</h2>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft-sm)] sm:p-6">
                                    <h3 className="mb-4 text-sm font-semibold text-foreground">Cash</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Orders</span>
                                            <span className="font-semibold">
                                                {formatIndianNumber(metrics.paymentBreakdown.cash.count)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Amount</span>
                                            <span className="font-semibold">
                                                {formatIndianRupees(metrics.paymentBreakdown.cash.amount)}
                                            </span>
                                        </div>
                                        {metrics.totalSales > 0 && (
                                            <div className="flex justify-between pt-2 border-t border-border">
                                                <span className="text-text-secondary">% of Total</span>
                                                <span className="font-semibold">
                                                    {((metrics.paymentBreakdown.cash.amount / metrics.totalSales) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft-sm)] sm:p-6">
                                    <h3 className="mb-4 text-sm font-semibold text-foreground">UPI</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Orders</span>
                                            <span className="font-semibold">
                                                {formatIndianNumber(metrics.paymentBreakdown.upi.count)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Amount</span>
                                            <span className="font-semibold">
                                                {formatIndianRupees(metrics.paymentBreakdown.upi.amount)}
                                            </span>
                                        </div>
                                        {metrics.totalSales > 0 && (
                                            <div className="flex justify-between pt-2 border-t border-border">
                                                <span className="text-text-secondary">% of Total</span>
                                                <span className="font-semibold">
                                                    {((metrics.paymentBreakdown.upi.amount / metrics.totalSales) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReportsPage;
