/**
 * ESC/POS Receipt Formatter for Electron
 * CommonJS version for use in main.cjs
 */

const ESC = String.fromCharCode(27);
const GS = String.fromCharCode(29);
const LF = String.fromCharCode(10);

const CHARS_PER_LINE = 42;

function formatCurrency(amount) {
  return '₹ ' + amount.toFixed(2);
}

function padLine(label, amount) {
  const maxLength = CHARS_PER_LINE;
  const totalLength = label.length + amount.length + 2;

  if (totalLength <= maxLength) {
    const spaces = ' '.repeat(maxLength - label.length - amount.length);
    return label + spaces + amount;
  }

  const truncated = label.substring(0, maxLength - amount.length - 2);
  const spaces = ' '.repeat(1);
  return truncated + spaces + amount;
}

function centerText(text) {
  const padding = Math.floor((CHARS_PER_LINE - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text;
}

function horizontalLine() {
  return '─'.repeat(CHARS_PER_LINE) + LF;
}

function formatDate(date) {
  try {
    const d = new Date(date || Date.now());
    const dateStr = d.toLocaleDateString('en-IN');
    const timeStr = d.toLocaleTimeString('en-IN').substring(0, 5);
    return dateStr + ' ' + timeStr;
  } catch {
    return new Date().toLocaleDateString('en-IN');
  }
}

function generateReceipt(order) {
  let receipt = '';

  // Initialize
  receipt += ESC + '@'; // Reset
  receipt += ESC + '!' + String.fromCharCode(48); // Normal font
  receipt += ESC + 'a' + String.fromCharCode(1); // Center align

  // Header
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold on
  receipt += ESC + 'd' + String.fromCharCode(1); // Double height
  receipt += centerText('RESTAURANT POS') + LF;
  receipt += ESC + 'd' + String.fromCharCode(0); // Double height off
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold off
  receipt += LF;

  // Order ID and Date
  receipt += ESC + 'a' + String.fromCharCode(1); // Center
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold
  receipt += centerText(`Order #${order.id}`) + LF;
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold off
  receipt += centerText(formatDate(order.createdAt)) + LF;
  receipt += LF;

  // Items section
  receipt += ESC + 'a' + String.fromCharCode(0); // Left align
  receipt += horizontalLine();

  // Table header
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold
  receipt += padLine('Item', 'Amount') + LF;
  receipt += padLine('Qty', 'Unit') + LF;
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold off
  receipt += horizontalLine();

  // Items
  let itemTotal = 0;
  for (const lineItem of order.items) {
    const itemName = lineItem.item.name.substring(0, 30);
    const lineAmount = lineItem.quantity * lineItem.unitPrice;
    itemTotal += lineAmount;

    receipt += padLine(itemName, formatCurrency(lineAmount)) + LF;
    receipt += padLine(`  x${lineItem.quantity}`, `@${formatCurrency(lineItem.unitPrice)}`) + LF;
  }

  receipt += horizontalLine();

  // Summary section
  receipt += ESC + 'a' + String.fromCharCode(0); // Left align
  receipt += padLine('Total:', formatCurrency(order.totalAmount)) + LF;

  // Payment details
  receipt += LF;
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold
  receipt += 'Payment Method: ' + (order.paymentMethod === 'cash' ? 'CASH' : 'UPI/ONLINE') + LF;
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold off

  receipt += padLine('Amount Received:', formatCurrency(order.amountReceived)) + LF;

  // Balance or Change
  const balanceLabel = order.balanceAmount >= 0 ? 'Change:' : 'Due:';
  const balanceAmount = Math.abs(order.balanceAmount);
  receipt += ESC + 'E' + String.fromCharCode(1); // Bold
  receipt += padLine(balanceLabel, formatCurrency(balanceAmount)) + LF;
  receipt += ESC + 'E' + String.fromCharCode(0); // Bold off

  // Footer
  receipt += LF + LF;
  receipt += ESC + 'a' + String.fromCharCode(1); // Center
  receipt += centerText('Thank You!') + LF;
  receipt += centerText('Visit Again') + LF;
  receipt += LF + LF;

  // Cut paper
  receipt += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0);

  return receipt;
}

module.exports = {
  generateReceipt,
  formatCurrency,
  padLine,
  centerText,
  horizontalLine,
};
