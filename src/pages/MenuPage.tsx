import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2, X, Check, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, PLACEHOLDER_IMAGE, type MenuItem } from "@/lib/pos/menu";
import { parseAmount, sanitizeAmount } from "@/lib/pos/payments";
import { usePos } from "@/lib/pos/store";

type FormState = {
    name: string;
    price: string;
    costPrice: string;
    image: string;
    category: string;
};

const EMPTY: FormState = { name: "", price: "", costPrice: "", image: "", category: "" };

function MenuPage() {
    const { menu, addMenuItem, updateMenuItem, deleteMenuItem } = usePos();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const isEditing = editingId !== null;

    const validate = (f: FormState) => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!f.name.trim()) e.name = "Name is required";
        else if (f.name.trim().length > 80) e.name = "Max 80 characters";

        const rawPrice = Number(f.price);
        const price = parseAmount(f.price);
        if (!f.price || f.price.includes("-") || !Number.isFinite(rawPrice)) e.price = "Price is required";
        else if (price <= 0) e.price = "Must be greater than 0";

        const rawCost = Number(f.costPrice || "0");
        const cost = parseAmount(f.costPrice || "0");
        if (f.costPrice && !Number.isFinite(rawCost)) e.costPrice = "Invalid number";
        else if (f.costPrice && f.costPrice.includes("-")) e.costPrice = "Cannot be negative";
        else if (cost < 0) e.costPrice = "Cannot be negative";
        else if (cost > price) e.costPrice = "Cannot exceed price";

        if (f.image && f.image.length > 500) e.image = "URL too long";
        if (f.category && f.category.length > 30) e.category = "Max 30 characters";
        return e;
    };

    const reset = () => {
        setForm(EMPTY);
        setEditingId(null);
        setErrors({});
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const errs = validate(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        const payload: Omit<MenuItem, "id"> = {
            name: form.name.trim(),
            price: sanitizeAmount(parseAmount(form.price)),
            costPrice: sanitizeAmount(parseAmount(form.costPrice || "0")),
            image: form.image.trim(),
            category: form.category.trim() || "Uncategorized",
        };

        try {
            if (editingId) {
                await updateMenuItem(editingId, payload);
                toast.success("Item updated");
            } else {
                await addMenuItem(payload);
                toast.success("Item added to menu");
            }
            reset();
        } catch (error) {
            console.error("Failed to save menu item:", error);
            toast.error("Failed to save item");
        }
    };

    const handleEdit = (item: MenuItem) => {
        setEditingId(item.id);
        setErrors({});
        setForm({
            name: item.name,
            price: String(item.price),
            costPrice: String(item.costPrice),
            image: item.image.startsWith("data:") ? "" : item.image,
            category: item.category,
        });
    };

    const handleDelete = async (item: MenuItem) => {
        if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
        try {
            await deleteMenuItem(item.id);
            if (editingId === item.id) reset();
            toast.success("Item deleted");
        } catch (error) {
            console.error("Failed to delete menu item:", error);
            toast.error("Failed to delete item");
        }
    };

    const previewImage = useMemo(
        () => (form.image.trim() ? form.image.trim() : PLACEHOLDER_IMAGE),
        [form.image],
    );

    return (
        <div className="flex-1 overflow-y-auto p-4 pb-32 sm:p-6 md:p-8 md:pb-8">

                <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-text-secondary">Menu</p>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Manage Items</h1>
                    </div>
                    <p className="text-sm text-text-secondary tabular">
                        {menu.length} {menu.length === 1 ? "item" : "items"}
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,400px)_1fr] lg:gap-6">
                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="h-fit rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft-sm)] sm:p-6"
                    >
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-primary-text">
                                {isEditing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-base font-semibold text-foreground">
                                    {isEditing ? "Edit Item" : "Add New Item"}
                                </h2>
                                <p className="text-xs text-text-secondary">
                                    {isEditing ? "Update product details" : "Create a new product for the POS"}
                                </p>
                            </div>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-alt hover:text-foreground"
                                    aria-label="Cancel edit"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Image preview */}
                        <div className="mb-5 flex items-center gap-3">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-alt ring-1 ring-border">
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                    }}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 flex-1 text-xs text-text-secondary">
                                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <ImageOff className="h-3.5 w-3.5" /> Image preview
                                </p>
                                <p>Paste any public image URL below.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Field label="Name" error={errors.name} required>
                                <input
                                    type="text"
                                    value={form.name}
                                    maxLength={80}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Classic Cheeseburger"
                                    className={inputCls(!!errors.name)}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Price (₹)" error={errors.price} required>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        placeholder="0.00"
                                        className={inputCls(!!errors.price)}
                                    />
                                </Field>
                                <Field label="Cost Price (₹)" error={errors.costPrice}>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        value={form.costPrice}
                                        onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                                        placeholder="0.00"
                                        className={inputCls(!!errors.costPrice)}
                                    />
                                </Field>
                            </div>

                            <Field label="Category" error={errors.category}>
                                <input
                                    type="text"
                                    value={form.category}
                                    maxLength={30}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    placeholder="Burgers, Sides, Drinks…"
                                    className={inputCls(!!errors.category)}
                                />
                            </Field>

                            <Field label="Image URL (optional)" error={errors.image}>
                                <input
                                    type="url"
                                    value={form.image}
                                    maxLength={500}
                                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                                    placeholder="https://…"
                                    className={inputCls(!!errors.image)}
                                />
                            </Field>
                        </div>

                        <button
                            type="submit"
                            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft-md)] transition-all duration-200 ease-[var(--ease-settle)] hover:bg-accent active:scale-[0.98]"
                        >
                            <Check className="h-4 w-4" />
                            {isEditing ? "Update Item" : "Add Item"}
                        </button>
                    </form>

                    {/* List */}
                    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft-sm)] sm:p-6">
                        <h2 className="mb-4 text-base font-semibold text-foreground">All Items</h2>
                        {menu.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt">
                                    <Plus className="h-7 w-7 text-text-secondary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">No items yet</p>
                                <p className="text-xs text-text-secondary">
                                    Use the form to add your first product.
                                </p>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                <AnimatePresence initial={false}>
                                    {menu.map((m) => {
                                        const active = editingId === m.id;
                                        return (
                                            <motion.li
                                                key={m.id}
                                                layout
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.96 }}
                                                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                                                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${active
                                                        ? "bg-surface-alt ring-2 ring-primary"
                                                        : "bg-surface-alt"
                                                    }`}
                                            >
                                                <img
                                                    src={m.image || PLACEHOLDER_IMAGE}
                                                    alt={m.name}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                                    }}
                                                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover ring-1 ring-border"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                        {m.name}
                                                    </p>
                                                    <p className="text-xs text-text-secondary">{m.category}</p>
                                                    <p className="mt-0.5 text-sm font-bold text-primary-text tabular">
                                                        {formatMoney(m.price)}
                                                        <span className="ml-2 text-[11px] font-medium text-text-secondary">
                                                            cost {formatMoney(m.costPrice)}
                                                        </span>
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <button
                                                        onClick={() => handleEdit(m)}
                                                        aria-label={`Edit ${m.name}`}
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-foreground shadow-[var(--shadow-soft-sm)] transition-colors hover:text-primary-text sm:h-8 sm:w-8"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(m)}
                                                        aria-label={`Delete ${m.name}`}
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-text-secondary shadow-[var(--shadow-soft-sm)] transition-colors hover:text-destructive sm:h-8 sm:w-8"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ul>
                        )}
                    </section>
                </div>
        </div>
    );
}

export default MenuPage;

function Field({
    label,
    error,
    required,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-secondary">
                {label}
                {required && <span className="ml-0.5 text-primary">*</span>}
            </span>
            {children}
            {error && (
                <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>
            )}
        </label>
    );
}

function inputCls(hasError: boolean) {
    return `h-12 w-full rounded-lg border bg-surface px-3 text-base text-foreground outline-none transition-colors focus:border-primary sm:h-11 sm:text-sm ${hasError ? "border-destructive" : "border-border"
        }`;
}
