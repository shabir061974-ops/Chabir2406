import { useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatKD } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const CartDrawer = () => {
    const { t, isRtl, ln } = useLang();
    const { items, open, setOpen, updateQty, removeItem, subtotal, count } = useCart();
    const navigate = useNavigate();

    const goCheckout = () => { setOpen(false); navigate("/checkout"); };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side={isRtl ? "left" : "right"} className="w-full sm:max-w-md flex flex-col p-0" data-testid="cart-drawer">
                <SheetHeader className="px-5 py-4 border-b border-border">
                    <SheetTitle className="font-heading text-xl flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-forest" /> {t("your_cart")} ({count})
                    </SheetTitle>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex-1 grid place-items-center text-center px-6">
                        <div>
                            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
                            <p className="mt-4 font-heading font-semibold text-lg">{t("cart_empty")}</p>
                            <p className="text-sm text-muted-foreground">{t("cart_empty_sub")}</p>
                            <Button className="mt-5 rounded-full bg-forest hover:bg-forest-dark" onClick={() => setOpen(false)}>
                                {t("continue_shopping")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {items.map((it) => (
                                <div key={it.line_id} className="flex gap-3" data-testid={`cart-item-${it.line_id}`}>
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
                                        {it.image && <img src={resolveImageUrl(it.image)} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm line-clamp-1">{ln(it)}</p>
                                        {it.addons?.length > 0 && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {it.addons.map((a) => ln(a)).join(", ")}
                                            </p>
                                        )}
                                        <p className="text-forest font-bold text-sm">{formatKD(it.unit_price)}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="flex items-center gap-1 rounded-full border border-border">
                                                <button onClick={() => updateQty(it.line_id, it.qty - 1)} className="grid place-items-center w-7 h-7" data-testid={`cart-dec-${it.line_id}`}><Minus className="w-3.5 h-3.5" /></button>
                                                <span className="w-6 text-center text-sm font-semibold font-mono">{it.qty}</span>
                                                <button onClick={() => updateQty(it.line_id, it.qty + 1)} className="grid place-items-center w-7 h-7" data-testid={`cart-inc-${it.line_id}`}><Plus className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <button onClick={() => removeItem(it.line_id)} className="text-muted-foreground hover:text-destructive ms-auto" data-testid={`cart-remove-${it.line_id}`}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-end font-semibold text-sm whitespace-nowrap">{formatKD(it.unit_price * it.qty)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border px-5 py-4 space-y-3">
                            <div className="flex justify-between font-heading font-bold text-lg">
                                <span>{t("subtotal")}</span>
                                <span data-testid="cart-subtotal">{formatKD(subtotal)}</span>
                            </div>
                            <Button onClick={goCheckout} data-testid="proceed-checkout-button"
                                className="w-full h-12 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold">
                                {t("proceed_checkout")}
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};
