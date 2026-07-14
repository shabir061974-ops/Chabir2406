import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Minus, ShoppingCart, ChevronLeft } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function ProductDetail() {
    const { id } = useParams();
    const { t, ln } = useLang();
    const { addItem } = useCart();
    const [qty, setQty] = useState(1);

    const { data: p, isLoading } = useQuery({
        queryKey: ["product", id],
        queryFn: async () => (await api.get(`/product`.replace("/product", `/products/${id}`))).data,
    });

    if (isLoading) {
        return <div className="mx-auto max-w-5xl px-6 py-10 grid md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-3xl" />
            <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24" /></div>
        </div>;
    }
    if (!p) return <div className="py-24 text-center text-muted-foreground">{t("no_products")}</div>;

    const soldOut = p.stock <= 0;
    const onAdd = () => { addItem(p, qty); toast.success(`${ln(p)} ${t("added")}`); };

    return (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8" data-testid="product-detail-page">
            <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest mb-6">
                <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" /> {t("all_products")}
            </Link>
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="relative overflow-hidden rounded-3xl bg-secondary/40 aspect-square border border-border">
                    {(p.images || [])[0] && <img src={p.images[0]} alt={ln(p)} className="w-full h-full object-cover" />}
                    {p.discount > 0 && <span className="absolute top-4 start-4 px-3 py-1.5 rounded-full bg-terracotta text-white text-sm font-bold">-{p.discount}%</span>}
                </div>

                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.2em] text-terracotta font-medium">{p.category}</span>
                    <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight mt-2">{ln(p)}</h1>
                    <p className="text-muted-foreground mt-1">{ln({ name_en: p.unit_en, name_ar: p.unit_ar })}</p>

                    <div className="flex items-end gap-3 mt-5">
                        <span className="font-heading font-extrabold text-3xl text-forest" data-testid="detail-price">{formatKD(p.effective_price ?? p.price)}</span>
                        {p.discount > 0 && <span className="text-lg text-muted-foreground line-through mb-1">{formatKD(p.price)}</span>}
                    </div>

                    {soldOut && (
                        <div className="mt-3">
                            <span className="inline-flex items-center gap-1 text-destructive font-medium text-sm">{t("out_of_stock")}</span>
                        </div>
                    )}

                    {p.barcode && <p className="mt-2 text-xs text-muted-foreground font-mono">Barcode: {p.barcode}</p>}

                    {!soldOut && (
                        <div className="mt-8 flex items-center gap-4">
                            <div className="flex items-center rounded-full border border-border h-12 px-2">
                                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid place-items-center w-9 h-9" data-testid="detail-qty-dec"><Minus className="w-4 h-4" /></button>
                                <span className="w-10 text-center font-bold font-mono" data-testid="detail-qty">{qty}</span>
                                <button onClick={() => setQty((q) => Math.min(p.stock, q + 1))} className="grid place-items-center w-9 h-9" data-testid="detail-qty-inc"><Plus className="w-4 h-4" /></button>
                            </div>
                            <Button onClick={onAdd} data-testid="detail-add-to-cart" className="flex-1 h-12 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold gap-2">
                                <ShoppingCart className="w-5 h-5" /> {t("add_to_cart")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
