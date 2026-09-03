import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "faiha_cart";

const genId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Every cart line has a `line_id` key. A no-addon line's line_id === its product_id
// (identical to the pre-addons behavior, since product_id was already the effective
// key everywhere) so nothing calling updateQty/removeItem/qtyOf with a product_id
// needs to change. A customized (has addons) line always gets its own generated
// line_id, since the same product can be added with different customizations.
const withLineIds = (items) => items.map((i) => ({ ...i, line_id: i.line_id || i.product_id }));

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { return withLineIds(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); } catch { return []; }
    });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = useCallback((product, qty = 1, addons = []) => {
        setItems((prev) => {
            if (addons.length === 0) {
                const existing = prev.find((i) => i.product_id === product.id && (!i.addons || i.addons.length === 0));
                if (existing) {
                    return prev.map((i) => i.line_id === existing.line_id ? { ...i, qty: i.qty + qty } : i);
                }
                return [...prev, {
                    line_id: product.id,
                    product_id: product.id,
                    barcode: product.barcode,
                    name_en: product.name_en,
                    name_ar: product.name_ar,
                    name: product.name_en,
                    image: (product.images || [])[0],
                    unit_en: product.unit_en,
                    unit_ar: product.unit_ar,
                    unit_price: product.effective_price ?? product.price,
                    source: product.source || "local",
                    addons: [],
                    addons_total: 0,
                    qty,
                }];
            }
            const addonsTotal = addons.reduce((s, a) => s + (a.price || 0), 0);
            return [...prev, {
                line_id: genId(),
                product_id: product.id,
                barcode: product.barcode,
                name_en: product.name_en,
                name_ar: product.name_ar,
                name: product.name_en,
                image: (product.images || [])[0],
                unit_en: product.unit_en,
                unit_ar: product.unit_ar,
                unit_price: (product.effective_price ?? product.price) + addonsTotal,
                source: product.source || "local",
                addons,
                addons_total: addonsTotal,
                qty,
            }];
        });
    }, []);

    const updateQty = useCallback((line_id, qty) => {
        setItems((prev) => qty <= 0
            ? prev.filter((i) => i.line_id !== line_id)
            : prev.map((i) => i.line_id === line_id ? { ...i, qty } : i));
    }, []);

    const removeItem = useCallback((line_id) => {
        setItems((prev) => prev.filter((i) => i.line_id !== line_id));
    }, []);

    const clear = useCallback(() => setItems([]), []);

    const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
    const subtotal = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.qty, 0), [items]);
    // Only meaningful for no-addon lines (line_id === product_id) -- quick-add quantity
    // steppers on the catalog grid never apply to customized lines.
    const qtyOf = useCallback((id) => items.find((i) => i.line_id === id)?.qty || 0, [items]);

    return (
        <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, count, subtotal, open, setOpen, qtyOf }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
