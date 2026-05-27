import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import { sanitizeAmount } from "./payments";

import {
  DEFAULT_MENU,
  getBillingPrice,
  type MenuItem,
} from "./menu";

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

export type ManualPriceOverrideInput = {
  item: MenuItem;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  items: CartLine[];
  totalAmount: number;
  profit: number;

  paymentMethod:
  | "cash"
  | "upi"
  | "card"
  | "other";

  paymentMode?: "exact" | "manual";

  amountReceived?: number;

  balanceAmount?: number;

  cashReceived?: number;

  change?: number;

  paymentReceived?: number;

  tip?: number;

  createdAt: number;

  isManual?: boolean;

  notes?: string;

  manualCost?: number;
};

type Ctx = {
  cart: CartLine[];

  orders: Order[];

  menu: MenuItem[];

  total: number;

  profit: number;

  itemCount: number;

  addItem: (item: MenuItem) => void;

  addManualOverrideItem: (
    input: ManualPriceOverrideInput
  ) => MenuItem | null;

  increment: (id: string) => void;

  decrement: (id: string) => void;

  remove: (id: string) => void;

  clear: () => void;

  buildTempOrder: (
    o: Omit<
      Order,
      | "id"
      | "createdAt"
      | "items"
      | "totalAmount"
      | "profit"
    >
  ) => Order;

  commitOrder: (order: Order) => void;

  addMenuItem: (
    data: Omit<MenuItem, "id">
  ) => Promise<MenuItem>;

  updateMenuItem: (
    id: string,
    data: Omit<MenuItem, "id">
  ) => Promise<void>;

  deleteMenuItem: (
    id: string
  ) => Promise<void>;
};

const PosCtx =
  createContext<Ctx | null>(null);

export function PosProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] =
    useState<CartLine[]>([]);

  const [menu, setMenu] =
    useState<MenuItem[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "menu"),
      (snapshot) => {
        const firebaseMenu =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as MenuItem[];

        setMenu(
          firebaseMenu.length > 0
            ? firebaseMenu
            : DEFAULT_MENU
        );
      }
    );

    return () => unsubscribe();
  }, []);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const committedOrderIdsRef =
    useRef(new Set<string>());

  const addItem = useCallback(
    (item: MenuItem) => {
      setCart((c) => {
        const existing = c.find(
          (l) => l.item.id === item.id
        );

        if (existing) {
          return c.map((l) =>
            l.item.id === item.id
              ? {
                ...l,
                quantity:
                  l.quantity + 1,
              }
              : l
          );
        }

        return [
          ...c,
          {
            item,
            quantity: 1,
          },
        ];
      });
    },
    []
  );

  const addManualOverrideItem =
    useCallback<
      Ctx["addManualOverrideItem"]
    >((input) => {
      const sourceItem =
        input.item;

      const price =
        sanitizeAmount(
          input.price
        );

      const quantity = Math.max(
        1,
        Math.floor(
          Number.isFinite(
            input.quantity
          )
            ? input.quantity
            : 1
        )
      );

      if (
        !sourceItem?.id ||
        !sourceItem.name.trim() ||
        price <= 0
      ) {
        return null;
      }

      const item: MenuItem = {
        ...sourceItem,

        id: `manual-${sourceItem.id}-${price.toFixed(
          2
        )}`,

        isManual: true,

        sourceItemId:
          sourceItem.sourceItemId ??
          sourceItem.id,

        originalPrice:
          sourceItem.originalPrice ??
          sourceItem.price,

        overriddenPrice: price,

        isPriceOverride: true,
      };

      setCart((c) => {
        const existing = c.find(
          (line) =>
            line.item.id === item.id
        );

        if (existing) {
          return c.map((line) =>
            line.item.id === item.id
              ? {
                ...line,
                item,
                quantity:
                  line.quantity +
                  quantity,
              }
              : line
          );
        }

        return [
          ...c,
          {
            item,
            quantity,
          },
        ];
      });

      return item;
    }, []);

  const increment = useCallback(
    (id: string) => {
      setCart((c) =>
        c.map((l) =>
          l.item.id === id
            ? {
              ...l,
              quantity:
                l.quantity + 1,
            }
            : l
        )
      );
    },
    []
  );

  const decrement = useCallback(
    (id: string) => {
      setCart((c) =>
        c
          .map((l) =>
            l.item.id === id
              ? {
                ...l,
                quantity:
                  Math.max(
                    0,
                    l.quantity - 1
                  ),
              }
              : l
          )
          .filter(
            (l) => l.quantity > 0
          )
      );
    },
    []
  );

  const remove = useCallback(
    (id: string) => {
      setCart((c) =>
        c.filter(
          (l) => l.item.id !== id
        )
      );
    },
    []
  );

  const clear = useCallback(
    () => setCart([]),
    []
  );

  const addMenuItem =
    useCallback<
      Ctx["addMenuItem"]
    >(async (data) => {
      const item = {
        ...data,
      };

      const docRef =
        await addDoc(
          collection(db, "menu"),
          item
        );

      return {
        ...item,
        id: docRef.id,
      };
    }, []);
  const updateMenuItem =
    useCallback<
      Ctx["updateMenuItem"]
    >(async (id, data) => {
      await updateDoc(
        doc(db, "menu", id),
        data
      );
    }, []);

  const deleteMenuItem =
    useCallback<
      Ctx["deleteMenuItem"]
    >(async (id) => {
      await deleteDoc(
        doc(db, "menu", id)
      );

      setCart((c) =>
        c.filter(
          (l) => l.item.id !== id
        )
      );
    }, []);

  const total = useMemo(
    () =>
      sanitizeAmount(
        cart.reduce(
          (s, l) =>
            s +
            getBillingPrice(
              l.item
            ) *
            l.quantity,
          0
        )
      ),
    [cart]
  );

  const profit = useMemo(
    () =>
      sanitizeAmount(
        cart.reduce(
          (s, l) =>
            s +
            (getBillingPrice(
              l.item
            ) -
              l.item
                .costPrice) *
            l.quantity,
          0
        )
      ),
    [cart]
  );

  const itemCount = useMemo(
    () =>
      cart.reduce(
        (s, l) =>
          s + l.quantity,
        0
      ),
    [cart]
  );

  const buildTempOrder =
    useCallback<
      Ctx["buildTempOrder"]
    >(
      (o) => {
        const now = new Date();

        const dateKey =
          `${now.getFullYear()}${String(
            now.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}${String(
            now.getDate()
          ).padStart(2, "0")}`;

        const todayCount =
          Number(
            localStorage.getItem(
              `order-count-${dateKey}`
            ) || "0"
          ) + 1;

        localStorage.setItem(
          `order-count-${dateKey}`,
          todayCount.toString()
        );

        const orderNumber = todayCount;

        const order: Order = {
          id: `ORD-${dateKey}-${String(
            orderNumber
          ).padStart(3, "0")}`,

          items: cart.map(
            (line) => ({
              ...line,

              item: {
                ...line.item,
              },
            })
          ),

          totalAmount: total,

          profit,

          createdAt:
            Date.now(),

          isManual: cart.some(
            (line) =>
              line.item
                .isManual
          ),

          ...o,
        };

        return order;
      },
      [
        cart,
        total,
        profit,
        orders,
      ]
    );

  const commitOrder =
    useCallback<
      Ctx["commitOrder"]
    >((order) => {
      if (
        committedOrderIdsRef.current.has(
          order.id
        )
      ) {
        return;
      }

      committedOrderIdsRef.current.add(
        order.id
      );

      setOrders((prev) => {
        if (
          prev.some(
            (o) =>
              o.id ===
              order.id
          )
        ) {
          return prev;
        }

        return [
          order,
          ...prev,
        ];
      });

      setCart([]);
    }, []);

  const value: Ctx = {
    cart,
    orders,
    menu,
    total,
    profit,
    itemCount,
    addItem,
    addManualOverrideItem,
    increment,
    decrement,
    remove,
    clear,
    buildTempOrder,
    commitOrder,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };

  return (
    <PosCtx.Provider value={value}>
      {children}
    </PosCtx.Provider>
  );
}

export function usePos() {
  const ctx =
    useContext(PosCtx);

  if (!ctx) {
    throw new Error(
      "usePos must be used within PosProvider"
    );
  }

  return ctx;
}