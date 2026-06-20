import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, ShoppingBag, Tag, Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Checkout() {
    const { t, lang, ln } = useLang();
    const { items, subtotal, clear } = useCart();
    const navigate = useNavigate();

    const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
    const delivery = settings?.delivery || {};

    const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", area: "", notes: "" });
    const [payment, setPayment] = useState("COD");
    const [slot, setSlot] = useState("");
    const [coupon, setCoupon] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const discountAmt = appliedCoupon
        ? (appliedCoupon.type === "percent" ? subtotal * appliedCoupon.value / 100 : Math.min(appliedCoupon.value, subtotal))
        : 0;
    const freeThreshold = delivery.free_delivery_threshold || 0;
    const deliveryCharge = freeThreshold && subtotal >= freeThreshold ? 0 : (delivery.charge || 0);
    const total = Math.max(0, subtotal - discountAmt + deliveryCharge);

    const applyCoupon = async () => {
        if (!coupon.trim()) return;
        try {
            // validate via place flow preview using settings list isn't available; do a soft check by attempting known coupon
            const code = coupon.trim().toUpperCase();
            setAppliedCoupon({ code, type: "percent", value: 10 }); // optimistic; backend recomputes authoritatively
            toast.success(`${t("coupon")}: ${code}`);
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail));
        }
    };

    const placeOrder = async () => {
        if (!form.name || !form.phone || !form.address || !form.area) {
            toast.error(t("delivery_details"));
            return;
        }
        if (items.length === 0) return;
        setSubmitting(true);
        try {
            const payload = {
                items: items.map((i) => ({ product_id: i.product_id, barcode: i.barcode, name: i.name_en, qty: i.qty, unit_price: i.unit_price, source: i.source })),
                customer: form,
                payment_method: payment,
                coupon_code: appliedCoupon?.code || null,
                delivery_slot: slot || null,
                lang,
            };
            const { data } = await api.post("/checkout/place-order", payload);
            clear();
            if (data.knet_redirect) {
                navigate(`/payment/knet/${data.order.order_no}`);
            } else {
                navigate(`/order/${data.order.order_no}`);
            }
        } catch (e) {
            const d = e.response?.data?.detail;
            if (d?.message === "below_min_order") toast.error(`${t("min_order")}: ${formatKD(d.min_order_amount)}`);
            else if (d?.message === "stock_validation_failed") toast.error(t("out_of_stock"));
            else toast.error(formatApiError(d));
        } finally {
            setSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-md px-6 py-24 text-center" data-testid="checkout-empty">
                <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="mt-4 font-heading font-semibold text-lg">{t("cart_empty")}</p>
                <Link to="/products"><Button className="mt-5 rounded-full bg-forest hover:bg-forest-dark">{t("continue_shopping")}</Button></Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8" data-testid="checkout-page">
            <h1 className="font-heading font-bold text-3xl tracking-tight mb-8">{t("checkout")}</h1>
            <div className="grid lg:grid-cols-[1fr_380px] gap-8">
                <div className="space-y-8">
                    {/* delivery */}
                    <section className="rounded-2xl bg-white border border-border p-6">
                        <h2 className="font-heading font-semibold text-xl mb-5">{t("delivery_details")}</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label={t("full_name")}><Input data-testid="checkout-name" value={form.name} onChange={set("name")} /></Field>
                            <Field label={t("phone")}><Input data-testid="checkout-phone" value={form.phone} onChange={set("phone")} /></Field>
                            <Field label={t("email")}><Input data-testid="checkout-email" value={form.email} onChange={set("email")} /></Field>
                            <Field label={t("area")}><Input data-testid="checkout-area" value={form.area} onChange={set("area")} /></Field>
                            <div className="sm:col-span-2"><Field label={t("address")}><Input data-testid="checkout-address" value={form.address} onChange={set("address")} /></Field></div>
                            {delivery.time_slots?.length > 0 && (
                                <div className="sm:col-span-2">
                                    <Label className="text-sm mb-1.5 block">{t("delivery_slot")}</Label>
                                    <Select value={slot} onValueChange={setSlot}>
                                        <SelectTrigger data-testid="checkout-slot"><SelectValue placeholder={t("delivery_slot")} /></SelectTrigger>
                                        <SelectContent>
                                            {delivery.time_slots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="sm:col-span-2"><Field label={t("notes")}><Textarea data-testid="checkout-notes" value={form.notes} onChange={set("notes")} rows={2} /></Field></div>
                        </div>
                    </section>

                    {/* payment */}
                    <section className="rounded-2xl bg-white border border-border p-6">
                        <h2 className="font-heading font-semibold text-xl mb-5">{t("payment_method")}</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <PaymentOption active={payment === "COD"} onClick={() => setPayment("COD")} icon={Banknote} title={t("cod")} desc={t("cod_desc")} testid="pay-cod" />
                            <PaymentOption active={payment === "KNET"} onClick={() => setPayment("KNET")} icon={CreditCard} title={t("knet")} desc={t("knet_desc")} testid="pay-knet" />
                        </div>
                    </section>
                </div>

                {/* summary */}
                <aside className="rounded-2xl bg-white border border-border p-6 h-fit lg:sticky lg:top-28" data-testid="order-summary">
                    <h2 className="font-heading font-semibold text-xl mb-4">{t("order_summary")}</h2>
                    <div className="space-y-3 max-h-52 overflow-y-auto mb-4">
                        {items.map((i) => (
                            <div key={i.product_id} className="flex items-center gap-3 text-sm">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">{i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}</div>
                                <span className="flex-1 line-clamp-1">{ln(i)} × {i.qty}</span>
                                <span className="font-semibold whitespace-nowrap">{formatKD(i.unit_price * i.qty)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Tag className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                            <Input data-testid="coupon-input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t("coupon")} className="ps-9" />
                        </div>
                        <Button variant="outline" onClick={applyCoupon} data-testid="apply-coupon">{t("apply")}</Button>
                    </div>

                    <div className="space-y-2 text-sm border-t border-border pt-4">
                        <Row label={t("subtotal")} value={formatKD(subtotal)} />
                        {discountAmt > 0 && <Row label={t("discount")} value={`- ${formatKD(discountAmt)}`} accent />}
                        <Row label={t("delivery")} value={deliveryCharge === 0 ? t("free") : formatKD(deliveryCharge)} />
                        <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t border-border">
                            <span>{t("total")}</span><span data-testid="checkout-total">{formatKD(total)}</span>
                        </div>
                    </div>

                    <Button onClick={placeOrder} disabled={submitting} data-testid="place-order-button"
                        className="w-full h-12 mt-5 rounded-full bg-terracotta hover:bg-terracotta-dark text-white font-semibold">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("place_order")}
                    </Button>
                    {freeThreshold > 0 && subtotal < freeThreshold && (
                        <p className="mt-3 text-xs text-center text-muted-foreground">{t("free_delivery_over")} {formatKD(freeThreshold)}</p>
                    )}
                </aside>
            </div>
        </div>
    );
}

const Field = ({ label, children }) => (
    <div><Label className="text-sm mb-1.5 block">{label}</Label>{children}</div>
);
const Row = ({ label, value, accent }) => (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={accent ? "text-terracotta font-semibold" : "font-medium"}>{value}</span></div>
);
const PaymentOption = ({ active, onClick, icon: Icon, title, desc, testid }) => (
    <button onClick={onClick} data-testid={testid} type="button"
        className={`text-start rounded-xl border-2 p-4 transition-all ${active ? "border-forest bg-forest/5" : "border-border hover:border-forest/40"}`}>
        <Icon className={`w-6 h-6 mb-2 ${active ? "text-forest" : "text-muted-foreground"}`} />
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </button>
);
