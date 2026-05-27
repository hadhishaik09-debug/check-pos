import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { BluetoothPrinterControl } from "./BluetoothPrinterControl";
import { formatMoney, PLACEHOLDER_IMAGE } from "@/lib/pos/menu";
import { usePos } from "@/lib/pos/store";
import { parseAmount } from "@/lib/pos/payments";

export function MenuGrid() {
  const pos = usePos();
  const { addItem, addManualOverrideItem } = pos;
  const menu = pos.menu ?? [];
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const [manualItemId, setManualItemId] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [manualError, setManualError] = useState("");

  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    menu.forEach((m) => m.category && set.add(m.category));
    return ["All", ...Array.from(set)];
  }, [menu]);

  const items = useMemo(() => {
    return menu
      .filter((m) => (cat === "All" ? true : m.category === cat))
      .filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  }, [menu, cat, q]);

  const selectedManualItem = useMemo(
    () => menu.find((item) => item.id === manualItemId) ?? null,
    [manualItemId, menu],
  );

  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault();

    const rawPrice = Number(manualPrice);
    const price = parseAmount(manualPrice);
    const quantity = Number.parseInt(manualQuantity, 10);

    if (!selectedManualItem) {
      setManualError("Select a product first");
      return;
    }

    if (!manualPrice.trim() || manualPrice.includes("-") || !Number.isFinite(rawPrice) || price <= 0) {
      setManualError("Enter a valid price");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      setManualError("Quantity must be at least 1");
      return;
    }

    const item = addManualOverrideItem({ item: selectedManualItem, price, quantity });
    if (!item) {
      setManualError("Could not add this item");
      return;
    }

    setManualItemId("");
    setManualPrice("");
    setManualQuantity("1");
    setManualError("");
  };

  return (
    <section className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-5 lg:gap-6 lg:p-6 md:flex-1 md:min-h-0 md:overflow-hidden">
      <header className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-medium text-text-secondary">Welcome back</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground text-balance sm:text-2xl">
              What would you like to order?
            </h1>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search menu…"
                className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-base text-foreground shadow-[var(--shadow-soft-sm)] outline-none transition-colors focus:border-primary sm:text-sm"
              />
            </div>
            <BluetoothPrinterControl />
          </div>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {categories.map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition-all duration-200 ease-[var(--ease-settle)] sm:h-10 ${active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft-md)]"
                    : "bg-surface text-text-secondary hover:text-foreground"
                  }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <form
          onSubmit={handleManualSubmit}
          className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft-sm)] sm:p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt text-primary-text">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Manual Item</h2>
              <p className="text-xs text-text-secondary">Select a product, then override its billing price</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.7fr)_96px_112px]">
            <select
              value={manualItemId}
              onChange={(event) => {
                const item = menu.find((candidate) => candidate.id === event.target.value);
                setManualItemId(event.target.value);
                setManualPrice(item ? String(item.price) : "");
                if (manualError) setManualError("");
              }}
              className="h-12 rounded-xl border border-border bg-surface-alt px-4 text-base font-semibold text-foreground outline-none transition-colors focus:border-primary sm:text-sm"
            >
              <option value="">Select product</option>
              {menu.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {formatMoney(item.price)}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={manualPrice}
              onChange={(event) => {
                setManualPrice(event.target.value);
                if (manualError) setManualError("");
              }}
              disabled={!selectedManualItem}
              placeholder={selectedManualItem ? "Override price" : "Select product first"}
              className="h-12 rounded-xl border border-border bg-surface-alt px-4 text-base font-semibold text-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={manualQuantity}
              onChange={(event) => {
                setManualQuantity(event.target.value);
                if (manualError) setManualError("");
              }}
              placeholder="Qty"
              className="h-12 rounded-xl border border-border bg-surface-alt px-4 text-base font-semibold text-foreground outline-none transition-colors focus:border-primary sm:text-sm"
            />
            <button
              type="submit"
              disabled={!selectedManualItem}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft-sm)] transition-all duration-200 ease-[var(--ease-settle)] hover:bg-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-text-secondary disabled:shadow-none sm:col-span-2 xl:col-span-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {selectedManualItem && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-text-secondary">
              <span className="rounded-full bg-surface-alt px-2.5 py-1 text-foreground">
                Selected: {selectedManualItem.name}
              </span>
              <span>Original price: {formatMoney(selectedManualItem.price)}</span>
            </div>
          )}
          {manualError && (
            <p className="mt-2 text-xs font-semibold text-destructive">{manualError}</p>
          )}
        </form>
      </header>

      <div className="md:independent-scroll md:min-h-0 md:flex-1 pr-0 lg:pr-1">
        <ul className="grid grid-cols-2 gap-3 pb-24 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((m) => (
            <motion.li
              key={m.id}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <button
                onClick={() => addItem(m)}
                className="group flex w-full flex-col overflow-hidden rounded-xl bg-surface text-left shadow-[var(--shadow-soft-sm)] transition-all duration-200 hover:shadow-[var(--shadow-soft-md)] active:bg-surface-alt"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <img
                    src={m.image || PLACEHOLDER_IMAGE}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-settle)] group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                    {m.name}
                  </p>
                  <p className="text-sm font-bold text-primary-text tabular">
                    {formatMoney(m.price)}
                  </p>
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
        {items.length === 0 && menu.length > 0 && (
          <div className="flex h-48 items-center justify-center text-text-secondary">
            No items match your search.
          </div>
        )}
        {menu.length === 0 && (
          <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-text-secondary">
            <p className="text-sm font-semibold text-foreground">No menu items yet</p>
            <p className="text-xs">Add products from the Menu tab to start selling.</p>
          </div>
        )}
      </div>
    </section>
  );
}
