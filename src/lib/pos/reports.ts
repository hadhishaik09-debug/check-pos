import { type Order } from "./store";
import { sanitizeAmount } from "./payments";

export { formatIndianNumber, formatIndianRupees } from "./payments";

/**
 * India Standard Time offset (UTC+5:30)
 */
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Get today's date in India timezone (start of day)
 */
export function getTodayIST(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istTime = new Date(utcTime + IST_OFFSET);
  istTime.setHours(0, 0, 0, 0);
  return new Date(istTime.getTime() - (istTime.getTimezoneOffset() * 60 * 1000 + IST_OFFSET));
}

/**
 * Start of the current day in IST
 */
export function getDayStartIST(date: Date = new Date()): number {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate.getTime();
}

/**
 * End of the current day in IST
 */
export function getDayEndIST(date: Date = new Date()): number {
  const localDate = new Date(date);
  localDate.setHours(23, 59, 59, 999);
  return localDate.getTime();
}

/**
 * Get start of week (Monday) in IST
 */
export function getWeekStartIST(date: Date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Get end of week (Sunday) in IST
 */
export function getWeekEndIST(date: Date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(23, 59, 59, 999);
  return sunday.getTime();
}

/**
 * Get start of month in IST
 */
export function getMonthStartIST(date: Date = new Date()): number {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of month in IST
 */
export function getMonthEndIST(date: Date = new Date()): number {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Get start of year in IST
 */
export function getYearStartIST(date: Date = new Date()): number {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of year in IST
 */
export function getYearEndIST(date: Date = new Date()): number {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface ReportFilter {
  period: ReportPeriod;
  startDate?: number;
  endDate?: number;
}

/**
 * Filter orders based on period and custom dates
 */
export function filterOrdersByPeriod(orders: Order[], filter: ReportFilter): Order[] {
  const now = new Date();

  let startTime: number;
  let endTime: number;

  switch (filter.period) {
    case "daily":
      startTime = getDayStartIST(now);
      endTime = getDayEndIST(now);
      break;
    case "weekly":
      startTime = getWeekStartIST(now);
      endTime = getWeekEndIST(now);
      break;
    case "monthly":
      startTime = getMonthStartIST(now);
      endTime = getMonthEndIST(now);
      break;
    case "yearly":
      startTime = getYearStartIST(now);
      endTime = getYearEndIST(now);
      break;
    case "custom":
      startTime = filter.startDate || getDayStartIST(now);
      endTime = filter.endDate || getDayEndIST(now);
      break;
    default:
      startTime = getDayStartIST(now);
      endTime = getDayEndIST(now);
  }

  return orders.filter((order) => order.createdAt >= startTime && order.createdAt <= endTime);
}

export interface ReportMetrics {
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  totalManualEntries: number;
  paymentBreakdown: {
    cash: { count: number; amount: number };
    upi: { count: number; amount: number };
    other?: { count: number; amount: number };
  };
  averageOrderValue: number;
  profitMargin: number;
}

/**
 * Calculate aggregated metrics from orders
 * Memoization-friendly: pure function with no side effects
 */
export function calculateMetrics(
  orders: Order[]
): ReportMetrics {
  const totalSales = sanitizeAmount(
    orders.reduce(
      (sum, order) =>
        sum + (order.totalAmount || 0),
      0
    )
  );

  const totalProfit = sanitizeAmount(
    orders.reduce((sum, order) => {
      const orderProfit = order.items.reduce(
        (itemSum: number, line: any) => {
          const lineProfit =
            line.totalPrice ||
            (line.unitPrice || 0) *
            (line.quantity || 0);

          return itemSum + lineProfit;
        },
        0
      );

      return sum + orderProfit;
    }, 0)
  );

  const totalOrders = orders.length;

  const totalManualEntries = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (itemSum: number, line: any) =>
          itemSum + (line.quantity || 0),
        0
      ),
    0
  );

  const paymentBreakdown = {
    cash: {
      count: 0,
      amount: 0,
    },

    upi: {
      count: 0,
      amount: 0,
    },
  };

  orders.forEach((order) => {
    if (order.paymentMethod === "cash") {
      paymentBreakdown.cash.count++;

      paymentBreakdown.cash.amount =
        sanitizeAmount(
          paymentBreakdown.cash.amount +
          order.totalAmount
        );
    } else if (
      order.paymentMethod === "upi"
    ) {
      paymentBreakdown.upi.count++;

      paymentBreakdown.upi.amount =
        sanitizeAmount(
          paymentBreakdown.upi.amount +
          order.totalAmount
        );
    }
  });

  const averageOrderValue =
    totalOrders > 0
      ? sanitizeAmount(
        totalSales / totalOrders
      )
      : 0;

  const profitMargin =
    totalSales > 0
      ? (totalProfit / totalSales) * 100
      : 0;

  return {
    totalSales,

    totalProfit,

    totalOrders,

    totalManualEntries,

    paymentBreakdown,

    averageOrderValue,

    profitMargin,
  };
}
/**
 * Format date for display (IST)
 */
export function formatDateIST(timestamp: number, format: "short" | "long" | "time" = "short"): string {
  const date = new Date(timestamp);

  if (format === "short") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (format === "long") {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get date range label
 */
export function getDateRangeLabel(filter: ReportFilter): string {
  const now = new Date();

  switch (filter.period) {
    case "daily":
      return `Today - ${formatDateIST(now.getTime(), "short")}`;
    case "weekly": {
      const start = new Date(getWeekStartIST(now));
      const end = new Date(getWeekEndIST(now));
      return `${formatDateIST(start.getTime(), "short")} - ${formatDateIST(end.getTime(), "short")}`;
    }
    case "monthly": {
      return now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    case "yearly": {
      return now.toLocaleDateString("en-IN", { year: "numeric" });
    }
    case "custom": {
      if (filter.startDate && filter.endDate) {
        return `${formatDateIST(filter.startDate, "short")} - ${formatDateIST(filter.endDate, "short")}`;
      }
      return "Custom Range";
    }
    default:
      return "Today";
  }
}

/**
 * Group orders by date for display
 */
export function groupOrdersByDate(
  orders: Order[]
): Record<string, Order[]> {
  const grouped: Record<string, Order[]> = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(order);
  });

  return grouped;
}
/**
 * Sort grouped orders by date (newest first)
 */
export function getSortedDateKeys(
  grouped: Record<string, Order[]>
): string[] {
  return Object.keys(grouped).sort(
    (a, b) =>
      new Date(b).getTime() -
      new Date(a).getTime()
  );
}
