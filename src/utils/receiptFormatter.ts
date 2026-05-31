export interface OrderItem {
  item: { id: string; name: string };
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber?: number;
  items: OrderItem[];
  totalAmount: number;
  amountReceived?: number;
  balanceAmount?: number;
  paymentMethod: 'cash' | 'upi';
  createdAt?: number | string;
}

const ESC = String.fromCharCode(27);
const GS = String.fromCharCode(29);
const LF = String.fromCharCode(10);
const CHARS_PER_LINE = 42; // ~80mm

function formatCurrency(amount: number) {
  return '₹ ' + amount.toFixed(2);
}

function centerText(text: string) {
  const padding = Math.floor((CHARS_PER_LINE - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text;
}

function horizontalLine() {
  return '─'.repeat(CHARS_PER_LINE) + '\n';
}

function padLine(label: string, amount: string) {
  const maxLength = CHARS_PER_LINE;
  const totalLength = label.length + amount.length;
  if (totalLength <= maxLength) {
    const spaces = ' '.repeat(maxLength - label.length - amount.length);
    return label + spaces + amount + '\n';
  }
  const truncated = label.substring(0, Math.max(0, maxLength - amount.length - 1));
  return truncated + ' ' + amount + '\n';
}

function formatDate(date?: number | string) {
  try {
    const d = new Date(date ?? Date.now());
    return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN').substring(0, 5);
  } catch {
    return new Date().toLocaleString('en-IN');
  }
}

export function generateReceipt(order: Order): Uint8Array {
  let out = '';

  out += ESC + '@'; // init
  out += ESC + 'a' + String.fromCharCode(1); // center
  out += ESC + 'E' + String.fromCharCode(1); // bold on
  out += ESC + 'd' + String.fromCharCode(1); // double height
  out += centerText('RESTAURANT POS') + '\n';
  out += ESC + 'd' + String.fromCharCode(0);
  out += ESC + 'E' + String.fromCharCode(0);
  out += LF;

  out += ESC + 'a' + String.fromCharCode(1);
  out += centerText(`Order #${order.id}`) + '\n';
  out += centerText(formatDate(order.createdAt)) + '\n';
  out += LF;

  out += ESC + 'a' + String.fromCharCode(0); // left
  out += horizontalLine();

  for (const li of order.items) {
const itemName =
  li.item?.name ||
  (li as any).name ||
  'Unknown Item';

const name = itemName.substring(0, 30);    const lineAmount = li.unitPrice * li.quantity;
    out += padLine(name, formatCurrency(lineAmount));
    out += padLine(`  x${li.quantity}`, `@${formatCurrency(li.unitPrice)}`);
  }

  out += horizontalLine();
  out += padLine('Total:', formatCurrency(order.totalAmount));
  out += LF;

  out += ESC + 'E' + String.fromCharCode(1);
  out += `Payment: ${order.paymentMethod.toUpperCase()}` + LF;
  out += ESC + 'E' + String.fromCharCode(0);

  if (typeof order.amountReceived === 'number') {
    out += padLine('Received:', formatCurrency(order.amountReceived));
  }
  if (typeof order.balanceAmount === 'number') {
    const label = order.balanceAmount >= 0 ? 'Change:' : 'Due:';
    out += padLine(label, formatCurrency(Math.abs(order.balanceAmount)));
  }

  out += LF + LF;
  out += ESC + 'a' + String.fromCharCode(1);
  out += centerText('Thank You!') + '\n';
  out += centerText('Visit Again') + '\n';
  out += LF + LF;

  // Cut
  out += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0);

  return new TextEncoder().encode(out);
}

export function generateReceiptBuffer(order: Order): Uint8Array {
  // Return a Uint8Array for browser compatibility (avoid Node Buffer)
  return generateReceipt(order);
}

export default generateReceipt;
