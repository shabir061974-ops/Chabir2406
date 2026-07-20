import { Link } from "react-router-dom";
import { Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatKD } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ProductCard = ({ product, index = 0 }) => {
    const { t, ln } = useLang();
    const { addItem, qtyOf, updateQty } = useCart();
    const qty = qtyOf(product.id);
    const hasDiscount = product.discount > 0;
    const soldOut = product.stock <= 0;
    const img = (product.images || [])[0];

    const onAdd = () => {
        if (soldOut) {
            toast.error("Sorry, this item is not available in the requested quantity.");
            return;
        }
        addItem(product, 1);
        toast.success(`${ln(product)} ${t("added")}`);
    };

    const onIncrement = () => {
        const newQty = qty + 1;
        if (newQty > product.stock) {
            toast.error("Sorry, this item is not available in the requested quantity.");
            return;
        }
        updateQty(product.id, newQty);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (index % 8) * 0.04 }}
            className="group flex flex-col rounded-2xl bg-card border border-border overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-forest/5 transition-all duration-300"
            data-testid={`product-card-${product.id}`}
        >
            <Link to={`/product/${product.id}`} className="relative block overflow-hidden bg-secondary/40 aspect-square">
                {img && (
                    <img src={resolveImageUrl(img)} alt={ln(product)} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1559056199-641a0ac8b3f7?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"; }} />
                )}
                {hasDiscount && (
                    <span className="absolute top-3 start-3 px-2 py-1 rounded-full bg-terracotta text-white text-xs font-bold">
                        -{product.discount}%
                    </span>
                )}
                {soldOut && (
                    <span className="absolute inset-0 grid place-items-center bg-white/70 text-forest font-semibold text-sm">
                        {t("out_of_stock")}
                    </span>
                )}
            </Link>

            <div className="flex flex-col flex-1 p-4 gap-1">
                <Link to={`/product/${product.id}`}>
                    <div className="font-heading font-medium text-base leading-snug text-foreground hover:text-forest transition-colors line-clamp-1">
                        {ln(product)}
                    </div>
                </Link>
                <p className="text-xs text-muted-foreground">{ln({ name_en: product.unit_en, name_ar: product.unit_ar })}</p>
                {!soldOut && product.stock < 10 && (
                    <p className="text-xs text-terracotta font-semibold mt-1">Only {product.stock} left!</p>
                )}

                <div className="mt-2 flex items-end gap-2">
                    <span className="font-heading font-bold text-lg text-forest" data-testid="product-price">
                        {formatKD(product.effective_price ?? product.price)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through mb-1">{formatKD(product.price)}</span>
                    )}
                </div>

                <div className="mt-auto pt-3">
                    {qty === 0 ? (
                        <Button onClick={onAdd} disabled={soldOut} data-testid={`add-to-cart-${product.id}`}
                            className="w-full rounded-full bg-forest hover:bg-forest-dark text-white font-semibold active:scale-95 transition-transform">
                            <Plus className="w-4 h-4 me-1" /> {t("add_to_cart")}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-between rounded-full bg-forest text-white px-1.5 h-10" data-testid={`qty-stepper-${product.id}`}>
                            <button onClick={() => updateQty(product.id, qty - 1)} className="grid place-items-center w-8 h-8 rounded-full hover:bg-white/15" data-testid={`qty-dec-${product.id}`}>
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold font-mono" data-testid={`qty-val-${product.id}`}>{qty}</span>
                            <button onClick={onIncrement} disabled={qty >= product.stock} className="grid place-items-center w-8 h-8 rounded-full hover:bg-white/15 disabled:opacity-40" data-testid={`qty-inc-${product.id}`}>
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
