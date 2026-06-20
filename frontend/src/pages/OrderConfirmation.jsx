import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Package, Truck, Clock, XCircle } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { formatKD } from "@/lib/format";
import { statusKey } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = ["pending", "confirmed", "processing", "delivered"];

export default function OrderConfirmation() {
    const { orderNo } = useParams();
    const { t, ln } = useLang();
    const { data: order, isLoading } = useQuery({
        queryKey: ["order", orderNo],
        queryFn: async () => (await api.get(`/orders/${orderNo}`)).data,
    });

    if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-16"><Skeleton className="h-64 rounded-3xl" /></div>;
    if (!order) return <div className="py-24 text-center text-muted-foreground">{t("no_products")}</div>;

    const cancelled = order.order_status === "cancelled";
    const currentStep = STEPS.indexOf(order.order_status);

    return (
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10" data-testid="order-confirmation-page">
            <div className="text-center">
                {cancelled
                    ? <XCircle className="w-16 h-16 mx-auto text-destructive" />
                    : <CheckCircle2 className="w-16 h-16 mx-auto text-forest-light" />}
                <h1 className="font-heading font-bold text-3xl tracking-tight mt-4">
                    {cancelled ? t("status_cancelled") : t("order_placed")}
                </h1>
                <p className="text-muted-foreground mt-1">{t("order_confirmed_sub")}</p>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-forest/10 text-forest font-semibold font-mono" data-testid="order-number">
                    {order.order_no}
                </div>
            </div>

            {!cancelled && (
                <div className="mt-10 flex items-center justify-between max-w-xl mx-auto" data-testid="order-tracker">
                    {STEPS.map((s, i) => {
                        const Icon = [Clock, CheckCircle2, Package, Truck][i];
                        const done = i <= currentStep;
                        return (
                            <div key={s} className="flex-1 flex flex-col items-center relative">
                                {i > 0 && <span className={`absolute top-5 -start-1/2 w-full h-0.5 ${i <= currentStep ? "bg-forest" : "bg-border"}`} />}
                                <span className={`relative z-10 grid place-items-center w-10 h-10 rounded-full ${done ? "bg-forest text-white" : "bg-secondary text-muted-foreground"}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                                <span className={`mt-2 text-xs font-medium ${done ? "text-forest" : "text-muted-foreground"}`}>{t(statusKey(s))}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-10 rounded-2xl bg-white border border-border p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-heading font-semibold text-lg">{t("order_summary")}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary font-medium">{order.payment_method} · {t(statusKey(order.order_status))}</span>
                </div>
                <div className="space-y-3">
                    {order.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">{it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}</div>
                            <span className="flex-1">{ln(it)} × {it.qty}</span>
                            <span className="font-semibold">{formatKD(it.line_total)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("subtotal")}</span><span>{formatKD(order.subtotal)}</span></div>
                    {order.discount_amount > 0 && <div className="flex justify-between text-terracotta"><span>{t("discount")}</span><span>- {formatKD(order.discount_amount)}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("delivery")}</span><span>{order.delivery_charge === 0 ? t("free") : formatKD(order.delivery_charge)}</span></div>
                    <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t border-border"><span>{t("total")}</span><span>{formatKD(order.net_payable)}</span></div>
                </div>
            </div>

            <div className="mt-6 text-sm text-muted-foreground bg-white border border-border rounded-2xl p-5">
                <p><strong className="text-foreground">{order.customer.name}</strong> · {order.customer.phone}</p>
                <p className="mt-1">{order.customer.address}, {order.customer.area}</p>
            </div>

            <div className="text-center mt-8">
                <Link to="/products"><Button className="rounded-full bg-forest hover:bg-forest-dark px-8">{t("continue_shopping")}</Button></Link>
            </div>
        </div>
    );
}
