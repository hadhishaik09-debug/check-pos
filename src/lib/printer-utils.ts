import type {
  Order,
  CartLine,
} from "./pos/store";

import {
  getBillingPrice,
} from "./pos/menu";

const ESC = "\x1b";

// SAFE ESC/POS COMMANDS

export const PRINTER_COMMANDS = {
  // RESET
  INIT: `${ESC}@`,

  // ALIGNMENT
  CENTER: `${ESC}a\x01`,
  LEFT: `${ESC}a\x00`,
  RIGHT: `${ESC}a\x02`,

  // TEXT STYLE
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,

  // NORMAL FONT
  NORMAL_SIZE: `${ESC}!\x00`,

  // FEED PAPER
  FEED_5: `${ESC}d\x05`,
};

const LINE_WIDTH = 32;

// DIVIDER

function divider() {
  return "-".repeat(LINE_WIDTH);
}

// CENTER TEXT

function centerText(text: string) {
  const padding = Math.max(
    0,
    Math.floor(
      (LINE_WIDTH - text.length) / 2,
    ),
  );

  return (
    " ".repeat(padding) + text
  );
}

// FORMAT ROW

function formatRow(
  left: string,
  right: string,
) {
  const space =
    LINE_WIDTH -
    left.length -
    right.length;

  return (
    left +
    " ".repeat(Math.max(space, 1)) +
    right
  );
}

// ITEM ROW

function formatItemRow(
  name: string,
  qty: number,
  total: number,
) {
  const qtyText = `x${qty}`;

  const priceText = `Rs.${total.toFixed(
    2,
  )}`;

  const left = `${name} ${qtyText}`;

  return formatRow(
    left.substring(0, 22),
    priceText,
  );
}

// MAIN RECEIPT FORMATTER

export function formatOrderForPrinter(
  order: Order,

  businessName: string = "HOTEL POS",
): Uint8Array {
  let text = "";

  // =========================
  // RESET
  // =========================

  text += PRINTER_COMMANDS.INIT;

  // =========================
  // HEADER
  // =========================

  text += PRINTER_COMMANDS.CENTER;

  text +=
    PRINTER_COMMANDS.BOLD_ON;

  text += `${businessName}\n`;

  text +=
    PRINTER_COMMANDS.BOLD_OFF;

  text += `${centerText(
    "Restaurant & Fast Food",
  )}\n`;

  text += `${centerText(
    "Bhimavaram",
  )}\n`;

  text += `${centerText(
    "Mobile Billing POS",
  )}\n`;

  text += divider() + "\n";

  // =========================
  // ORDER DETAILS
  // =========================

  text += PRINTER_COMMANDS.LEFT;

  text += `Bill No : ${order.id}\n`;

  text += `Date    : ${new Date(
    order.createdAt,
  ).toLocaleString()}\n`;

  text += `Payment : ${order.paymentMethod.toUpperCase()}\n`;

  text += divider() + "\n";

  // =========================
  // TABLE HEADER
  // =========================

  text +=
    PRINTER_COMMANDS.BOLD_ON;

  text +=
    formatRow(
      "Item",
      "Amount",
    ) + "\n";

  text +=
    PRINTER_COMMANDS.BOLD_OFF;

  text += divider() + "\n";

  // =========================
  // ITEMS
  // =========================

  order.items.forEach(
    (line: CartLine) => {
      const itemPrice =
        getBillingPrice(line.item);

      const total =
        itemPrice *
        line.quantity;

      text +=
        formatItemRow(
          line.item.name,
          line.quantity,
          total,
        ) + "\n";
    },
  );

  text += divider() + "\n";

  // =========================
  // TOTALS
  // =========================

  text += PRINTER_COMMANDS.RIGHT;

  text += `Subtotal : Rs.${order.totalAmount.toFixed(
    2,
  )}\n`;

  const gst =
    order.totalAmount * 0.05;

  text += `GST (5%) : Rs.${gst.toFixed(
    2,
  )}\n`;

  const finalTotal =
    order.totalAmount + gst;

  text +=
    PRINTER_COMMANDS.BOLD_ON;

  text += `TOTAL : Rs.${finalTotal.toFixed(
    2,
  )}\n`;

  text +=
    PRINTER_COMMANDS.BOLD_OFF;

  text += divider() + "\n";

  // =========================
  // PAYMENT
  // =========================

  const received =
    order.amountReceived ??
    order.cashReceived ??
    order.paymentReceived ??
    finalTotal;

  const balance =
    received - finalTotal;

  text += `Received : Rs.${received.toFixed(
    2,
  )}\n`;

  text += `Balance  : Rs.${balance.toFixed(
    2,
  )}\n`;

  text += divider() + "\n";

  // =========================
  // FOOTER
  // =========================

  text += PRINTER_COMMANDS.CENTER;

  text += "\n";

  text += `${centerText(
    "THANK YOU!",
  )}\n`;

  text += `${centerText(
    "VISIT AGAIN",
  )}\n`;

  text += "\n";

  // =========================
  // FINISH
  // =========================

  text +=
    PRINTER_COMMANDS.FEED_5;

  text += "\n\n\n";

  // =========================
  // CONVERT TO BYTES
  // =========================

  const encoder =
    new TextEncoder();

  return encoder.encode(text);
}