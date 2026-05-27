import {
  formatMoney,
  getBillingPrice,
} from "@/lib/pos/menu";

import type {
  Order,
} from "@/lib/pos/store";

const SHOP_NAME = "HOTEL POS";

const SHOP_TAGLINE =
  "Restaurant & Fast Food";

const SHOP_ADDRESS =
  "Bhimavaram";

const SHOP_PHONE =
  "+91 XXXXX XXXXX";

interface ReceiptProps {
  order: Order | null;
}

export function Receipt({
  order,
}: ReceiptProps) {
  if (!order) return null;

  const date = new Date(
    order.createdAt,
  );

  const dateStr =
    date.toLocaleDateString();

  const timeStr =
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const itemCount =
    order.items.reduce(
      (s, l) => s + l.quantity,
      0,
    );

  const subtotal =
    order.totalAmount;

  const gst =
    Math.round(subtotal * 0.05);

  const finalTotal =
    subtotal + gst;

  const amountReceived =
    order.amountReceived ??
    (order.paymentMethod === "cash"
      ? order.cashReceived
      : order.paymentReceived) ??
    finalTotal;

  const balanceAmount =
    amountReceived - finalTotal;

  return (
    <div className="w-full">
      {/* RECEIPT */}

      <div
        className="
          rounded-2xl
          border
          bg-white
          p-5
          text-black
          shadow-sm
        "
        style={{
          backgroundColor: "white",
          color: "black",
        }}
      >
        {/* HEADER */}

        <div className="mb-4 text-center">
          <div className="text-3xl font-bold">
            {SHOP_NAME}
          </div>

          <div className="text-sm">
            {SHOP_TAGLINE}
          </div>

          <div className="text-xs">
            {SHOP_ADDRESS}
          </div>

          <div className="text-xs">
            {SHOP_PHONE}
          </div>
        </div>

        <Divider />

        {/* ORDER INFO */}

        <div className="mb-3 text-xs">
          <Row
            label="Order ID"
            value={order.id}
          />

          <Row
            label="Date"
            value={dateStr}
          />

          <Row
            label="Time"
            value={timeStr}
          />

          <Row
            label="Cashier"
            value="Admin"
          />
        </div>

        <Divider />

        {/* ITEMS */}

        <div className="space-y-3">
          {order.items.map((line) => {
            const unitPrice =
              getBillingPrice(
                line.item,
              );

            const lineTotal =
              unitPrice *
              line.quantity;

            return (
              <div
                key={line.item.id}
              >
                <div className="text-sm font-semibold">
                  {line.item.name}
                </div>

                <div className="flex justify-between text-xs">
                  <span>
                    {line.quantity} ×{" "}
                    {formatMoney(
                      unitPrice,
                    )}
                  </span>

                  <span>
                    {formatMoney(
                      lineTotal,
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Divider />

        {/* TOTALS */}

        <Row
          label={`Items (${itemCount})`}
          value={formatMoney(
            subtotal,
          )}
        />

        <Row
          label="GST (5%)"
          value={formatMoney(gst)}
        />

        <Divider />

        <Row
          label="TOTAL"
          value={formatMoney(
            finalTotal,
          )}
          bold
          large
        />

        <Divider />

        {/* PAYMENT */}

        <Row
          label="Payment"
          value={
            order.paymentMethod ===
              "cash"
              ? "CASH"
              : "UPI / ONLINE"
          }
        />

        <Row
          label="Received"
          value={formatMoney(
            amountReceived,
          )}
        />

        <Row
          label="Balance"
          value={formatMoney(
            balanceAmount,
          )}
        />

        <Divider />

        {/* FOOTER */}

        <div className="mt-5 text-center">
          <div className="font-bold">
            THANK YOU!
          </div>

          <div className="text-xs">
            VISIT AGAIN 😊
          </div>
        </div>
      </div>
    </div>
  );
}

// DIVIDER

function Divider() {
  return (
    <div className="my-3 border-t border-dashed border-black" />
  );
}

// ROW

function Row({
  label,
  value,
  bold,
  large,
}: {
  label: string;

  value: string;

  bold?: boolean;

  large?: boolean;
}) {
  return (
    <div
      className={`
        my-1
        flex
        justify-between
        items-center
        ${bold ? "font-bold" : ""}
        ${large ? "text-base" : "text-sm"}
      `}
    >
      <span>{label}</span>

      <span>{value}</span>
    </div>
  );
}