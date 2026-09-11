import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, ShoppingBag, Tag, Loader2, MapPin, Car } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { formatKD } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Checkout() {
    const { t, lang, ln } = useLang();
    const { items, subtotal, clear } = useCart();
    const navigate = useNavigate();

    const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
    const delivery = settings?.delivery || {};
    // Only show the coupon box when at least one usable coupon is configured in the admin.
    const { data: couponMeta } = useQuery({ queryKey: ["coupons-active"], queryFn: async () => (await api.get("/coupons/active")).data });

    const productIds = useMemo(() => [...new Set(items.map(i => i.product_id))], [items]);
    const { data: products = {} } = useQuery({
        queryKey: ["checkout-products", productIds],
        queryFn: async () => {
            if (!productIds.length) return {};
            const data = await Promise.all(productIds.map(id => api.get(`/products/${id}`).then(r => r.data)));
            return Object.fromEntries(data.map(p => [p.id, p]));
        },
        enabled: productIds.length > 0,
    });

    const [form, setForm] = useState({ name: "", phone: "", email: "", shareholder_number: "" });
    const [fulfillment, setFulfillment] = useState("PICKUP");
    const [vehicle, setVehicle] = useState({ number: "", color: "" });
    const [vehicleErrors, setVehicleErrors] = useState({ number: false, color: false });
    const [payment, setPayment] = useState("Cash");
    const [coupon, setCoupon] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const discountAmt = appliedCoupon
        ? (appliedCoupon.type === "percent" ? subtotal * appliedCoupon.value / 100 : Math.min(appliedCoupon.value, subtotal))
        : 0;
    const freeThreshold = delivery.free_delivery_threshold || 0;
    const deliveryCharge = freeThreshold && subtotal >= freeThreshold ? 0 : (delivery.charge || 0);
    const total = Math.max(0, subtotal - discountAmt + deliveryCharge);

    const applyCoupon = async () => {
        const code = coupon.trim();
        if (!code) return;
        try {
            const { data } = await api.post("/coupons/validate", { code, subtotal });
            if (data.valid) {
                setAppliedCoupon({ code: data.code, type: data.type, value: data.value });
                setCouponError("");
                toast.success(t("coupon_applied"));
            } else {
                setAppliedCoupon(null);
                setCouponError(t("coupon_invalid"));
                toast.error(t("coupon_invalid"));
            }
        } catch (e) {
            setAppliedCoupon(null);
            setCouponError(t("coupon_invalid"));
            toast.error(t("coupon_invalid"));
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCoupon("");
        setCouponError("");
    };

    const placeOrder = async () => {
        if (!form.name || !form.phone) {
            toast.error(t("enter_name_phone"));
            return;
        }

        const errors = { number: false, color: false };
        if (fulfillment === "CAR_SERVICE") {
            if (!vehicle.number.trim()) {
                errors.number = true;
            }
            if (!vehicle.color.trim()) {
                errors.color = true;
            }
            if (errors.number || errors.color) {
                setVehicleErrors(errors);
                return;
            }
        }

        if (items.length === 0) return;
        setSubmitting(true);
        const payload = {
            items: items.map((i) => ({
                product_id: i.product_id, barcode: i.barcode != null ? String(i.barcode) : null,
                name: i.name_en, qty: i.qty, unit_price: i.unit_price, source: i.source,
                addon_item_ids: (i.addons || []).map((a) => a.item_id),
            })),
            customer: { name: form.name, phone: form.phone, email: form.email || null, shareholder_number: form.shareholder_number || null },
            fulfillment_type: fulfillment,
            vehicle_number: fulfillment === "CAR_SERVICE" ? vehicle.number : null,
            vehicle_color: fulfillment === "CAR_SERVICE" ? vehicle.color : null,
            payment_method: payment,
            coupon_code: appliedCoupon?.code || null,
            lang,
        };
        try {
            const { data } = await api.post("/checkout/place-order", payload);
            clear();
            navigate(`/order/${data.order.order_no}`);
        } catch (e) {
            setSubmitting(false);
            const d = e.response?.data?.detail;
            if (d?.message === "below_min_order") toast.error(`${t("min_order")}: ${formatKD(d.min_order_amount)}`);
            else if (d?.message === "stock_validation_failed") toast.error(t("out_of_stock"));
            else if (d?.message === "vehicle_details_required") toast.error(t("vehicle_number_required"));
            else toast.error(formatApiError(d));
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
                    {/* customer */}
                    <section className="rounded-2xl bg-white border border-border p-6">
                        <h2 className="font-heading font-semibold text-xl mb-5">{t("customer_details")}</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label={t("full_name")}><Input data-testid="checkout-name" value={form.name} onChange={set("name")} /></Field>
                            <Field label={t("phone")}><Input data-testid="checkout-phone" value={form.phone} onChange={set("phone")} /></Field>
                            <div className="sm:col-span-2"><Field label={t("shareholder_number")}><Input data-testid="checkout-shareholder-number" value={form.shareholder_number} onChange={set("shareholder_number")} /></Field></div>
                            <div className="sm:col-span-2"><Field label={t("email")}><Input data-testid="checkout-email" value={form.email} onChange={set("email")} /></Field></div>
                        </div>
                    </section>

                    {/* fulfillment type */}
                    <section className="rounded-2xl bg-white border border-border p-6">
                        <h2 className="font-heading font-semibold text-xl mb-5">{t("fulfillment_type")}</h2>
                        <div className="grid sm:grid-cols-2 gap-3 mb-6">
                            <FulfillmentOption active={fulfillment === "PICKUP"} onClick={() => { setFulfillment("PICKUP"); setVehicleErrors({ number: false, color: false }); }} icon={MapPin} title={t("pickup")} desc={t("pickup_desc")} testid="fulfillment-pickup" />
                            <FulfillmentOption active={fulfillment === "CAR_SERVICE"} onClick={() => setFulfillment("CAR_SERVICE")} icon={Car} title={t("car_service")} desc={t("car_service_desc")} testid="fulfillment-car-service" />
                        </div>

                        {fulfillment === "CAR_SERVICE" && (
                            <div className="pt-6 border-t border-border space-y-4">
                                <h3 className="font-semibold text-lg">{t("vehicle_details")}</h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Field label={t("vehicle_number")}>
                                            <Input data-testid="vehicle-number" value={vehicle.number} onChange={(e) => { setVehicle({ ...vehicle, number: e.target.value }); setVehicleErrors({ ...vehicleErrors, number: false }); }} />
                                        </Field>
                                        {vehicleErrors.number && <p className="text-xs text-destructive mt-1">{t("vehicle_number_required")}</p>}
                                    </div>
                                    <div>
                                        <Field label={t("vehicle_color")}>
                                            <Input data-testid="vehicle-color" value={vehicle.color} onChange={(e) => { setVehicle({ ...vehicle, color: e.target.value }); setVehicleErrors({ ...vehicleErrors, color: false }); }} />
                                        </Field>
                                        {vehicleErrors.color && <p className="text-xs text-destructive mt-1">{t("vehicle_color_required")}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* payment */}
                    <section className="rounded-2xl bg-white border border-border p-6">
                        <h2 className="font-heading font-semibold text-xl mb-5">{t("payment_method")}</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <PaymentOption active={payment === "Cash"} onClick={() => setPayment("Cash")} icon={Banknote} title={t("cod")} desc={t("cod_desc")} testid="pay-cod" />
                            <PaymentOption active={payment === "KNET"} onClick={() => setPayment("KNET")} icon={CreditCard} title={t("knet")} desc={t("knet_desc")} testid="pay-knet" />
                        </div>
                    </section>
                </div>

                {/* summary */}
                <aside className="rounded-2xl bg-white border border-border p-6 h-fit lg:sticky lg:top-28" data-testid="order-summary">
                    <h2 className="font-heading font-semibold text-xl mb-4">{t("order_summary")}</h2>
                    <div className="space-y-3 max-h-52 overflow-y-auto mb-4">
                        {items.map((i) => {
                            const currentProduct = products[i.product_id];
                            const currentImage = currentProduct?.images?.[0] || i.image;
                            return (
                                <div key={i.line_id} className="flex items-center gap-3 text-sm">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">{currentImage && <img src={resolveImageUrl(currentImage)} alt="" className="w-full h-full object-cover" />}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold line-clamp-1">{ln(i)}</p>
                                        {i.addons?.length > 0 && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {i.addons.map((a) => ln(a)).join(", ")}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">{formatKD(i.unit_price)}</p>
                                    </div>
                                    <span className="font-semibold whitespace-nowrap">{formatKD(i.unit_price * i.qty)}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Coupon box appears only when the admin has at least one usable coupon configured. */}
                    {couponMeta?.has_active && (
                        <div className="mb-4">
                            {appliedCoupon ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-forest/30 bg-forest/5 px-3 py-2" data-testid="coupon-applied">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-forest"><Tag className="w-4 h-4" /> {appliedCoupon.code}</span>
                                    <button type="button" onClick={removeCoupon} data-testid="remove-coupon" className="text-xs text-muted-foreground hover:text-destructive">{t("remove")}</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                                        <Input data-testid="coupon-input" value={coupon}
                                            onChange={(e) => { setCoupon(e.target.value); setCouponError(""); }}
                                            onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                                            placeholder={t("coupon")} className="ps-9" />
                                    </div>
                                    <Button variant="outline" onClick={applyCoupon} data-testid="apply-coupon">{t("apply")}</Button>
                                </div>
                            )}
                            {couponError && <p className="mt-1.5 text-xs text-destructive" data-testid="coupon-error">{couponError}</p>}
                        </div>
                    )}

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
const FulfillmentOption = ({ active, onClick, icon: Icon, title, desc, testid }) => (
    <button onClick={onClick} data-testid={testid} type="button"
        className={`relative text-start rounded-xl border-2 p-4 transition-all ${
            active
                ? "border-forest bg-forest/5"
                : "border-border hover:border-forest/40"
        }`}>
        <Icon className={`w-6 h-6 mb-2 ${active ? "text-forest" : "text-muted-foreground"}`} />
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </button>
);
const PaymentOption = ({ active, onClick, icon: Icon, title, desc, testid, disabled, note }) => (
    <button onClick={disabled ? undefined : onClick} data-testid={testid} type="button" disabled={disabled} aria-disabled={disabled}
        className={`relative text-start rounded-xl border-2 p-4 transition-all ${
            disabled
                ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
                : active
                ? "border-forest bg-forest/5"
                : "border-border hover:border-forest/40"
        }`}>
        <Icon className={`w-6 h-6 mb-2 ${active && !disabled ? "text-forest" : "text-muted-foreground"}`} />
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        {disabled && note && (
            <span className="mt-2 inline-block text-[11px] font-medium text-terracotta">{note}</span>
        )}
    </button>
);
