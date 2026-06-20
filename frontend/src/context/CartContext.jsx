import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "faiha_cart";

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
    });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = useCallback((product, qty = 1) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product_id === product.id);
            if (existing) {
                return prev.map((i) => i.product_id === product.id ? { ...i, qty: i.qty + qty } : i);
            }
            return [...prev, {
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
                qty,
            }];
        });
    }, []);

    const updateQty = useCallback((product_id, qty) => {
        setItems((prev) => qty <= 0
            ? prev.filter((i) => i.product_id !== product_id)
            : prev.map((i) => i.product_id === product_id ? { ...i, qty } : i));
    }, []);

    const removeItem = useCallback((product_id) => {
        setItems((prev) => prev.filter((i) => i.product_id !== product_id));
    }, []);

    const clear = useCallback(() => setItems([]), []);

    const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
    const subtotal = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.qty, 0), [items]);
    const qtyOf = useCallback((id) => items.find((i) => i.product_id === id)?.qty || 0, [items]);

    return (
        <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, count, subtotal, open, setOpen, qtyOf }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
