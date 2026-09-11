import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Package, Truck, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useCustomer } from "@/context/CustomerAuthContext";
import { formatKD } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import { statusKey } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = ["NEW", "PREPARING", "READY", "COMPLETED"];

export default function OrderConfirmation() {
    const { orderNo } = useParams();
    const { t, ln } = useLang();
    const qc = useQueryClient();
    const { customer } = useCustomer();
    const [arrivedSubmitting, setArrivedSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const { data: order, isLoading } = useQuery({
        queryKey: ["order", orderNo],
        queryFn: async () => (await api.get(`/orders/${orderNo}`)).data,
        refetchInterval: autoRefreshEnabled ? 8000 : false,
    });

    if (isLoading) return <div className="mx-auto max-w-2xl px-6 py-16"><Skeleton className="h-64 rounded-3xl" /></div>;
    if (!order) return <div className="py-24 text-center text-muted-foreground">{t("no_products")}</div>;

    const cancelled = order.order_status === "CANCELLED";
    const currentStep = STEPS.indexOf(order.order_status);
    const isReady = order.order_status === "READY";
    const isCarServiceReady = isReady && order.fulfillment_type === "CAR_SERVICE";
    const hasArrived = order.car_service_arrived === true;

    const markArrival = async () => {
        setArrivedSubmitting(true);
        try {
            await api.post(`/orders/${orderNo}/car-service-arrival`);
            qc.invalidateQueries({ queryKey: ["order", orderNo] });
        } catch (e) {
            console.error("Failed to mark arrival:", e);
        } finally {
            setArrivedSubmitting(false);
        }
    };

    const refreshStatus = async () => {
        setRefreshing(true);
        try {
            await qc.refetchQueries({ queryKey: ["order", orderNo] });
        } catch (e) {
            console.error("Failed to refresh status:", e);
        } finally {
            setRefreshing(false);
        }
    };

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
                <div className="mt-10 space-y-6">
                    <div className="flex items-center justify-between max-w-xl mx-auto w-full" data-testid="order-tracker">
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
                    <div className="flex justify-center">
                        <Button
                            onClick={refreshStatus}
                            disabled={refreshing}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                            {t("refresh_status") || "Refresh Status"}
                        </Button>
                    </div>
                </div>
            )}

            {isReady && (
                <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-200 p-6">
                    <p className="font-semibold text-blue-900 mb-3">
                        {order.fulfillment_type === "PICKUP"
                            ? t("ready_for_pickup_message") || "Your order is ready for collection."
                            : t("ready_for_car_service_message") || "Your order is ready. Please come to the Faiha Co-op parking area and wait in your vehicle."}
                    </p>
                    {order.fulfillment_type === "CAR_SERVICE" && (
                        <div className="text-sm text-blue-800 mt-3 space-y-1">
                            {order.vehicle_number && <p><strong>Vehicle #:</strong> {order.vehicle_number}</p>}
                            {order.vehicle_color && <p><strong>Vehicle Color:</strong> {order.vehicle_color}</p>}
                        </div>
                    )}

                    {isCarServiceReady && !hasArrived && (
                        <button
                            onClick={markArrival}
                            disabled={arrivedSubmitting}
                            className="mt-4 w-full bg-forest hover:bg-forest-dark text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {arrivedSubmitting ? "Submitting..." : t("car_service_arrived_button") || "I Have Arrived"}
                        </button>
                    )}
                </div>
            )}

            {isCarServiceReady && hasArrived && (
                <div className="mt-8 rounded-2xl bg-green-50 border border-green-200 p-6">
                    <div className="flex gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                        <div>
                            <p className="font-semibold text-green-900 mb-2">
                                {t("car_service_arrived_confirmation") || "Thank you. Our staff has been notified that you have arrived."}
                            </p>
                            <p className="text-sm text-green-800">
                                {t("car_service_arrived_instructions") || "Please remain in your vehicle. Our staff will bring your order to you."}
                            </p>
                            {order.car_service_arrived_at && (
                                <p className="text-xs text-green-700 mt-2">
                                    {t("car_service_arrived_at")}: {new Date(order.car_service_arrived_at).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-10 rounded-2xl bg-white border border-border p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-heading font-semibold text-lg">{t("order_summary")}</h2>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-secondary font-medium">{order.payment_method} · {t(statusKey(order.order_status))}</span>
                </div>
                <div className="space-y-3">
                    {order.items.map((it, i) => (
                        <div key={`${it.product_id}-${i}`} className="flex items-center gap-3 text-sm">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">{it.image && <img src={resolveImageUrl(it.image)} alt="" className="w-full h-full object-cover" />}</div>
                            <span className="flex-1">
                                {ln(it)} × {it.qty}
                                {it.addons?.length > 0 && (
                                    <span className="block text-xs text-muted-foreground">
                                        {it.addons.map((a) => ln({ name_en: a.item_name_en, name_ar: a.item_name_ar })).join(", ")}
                                    </span>
                                )}
                            </span>
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
                {order.customer.shareholder_number && <p className="mt-1">{t("shareholder_number")}: {order.customer.shareholder_number}</p>}
                {order.fulfillment_type && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <p><strong className="text-foreground">{t("fulfillment_method")}</strong></p>
                        <p className="mt-1">{order.fulfillment_type === "PICKUP" ? t("pickup") : t("car_service")}</p>
                        {order.fulfillment_type === "CAR_SERVICE" && (
                            <>
                                {order.vehicle_number && <p className="mt-1">{t("vehicle_number")}: {order.vehicle_number}</p>}
                                {order.vehicle_color && <p className="mt-1">{t("vehicle_color")}: {order.vehicle_color}</p>}
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Link to="/products"><Button className="rounded-full bg-forest hover:bg-forest-dark px-8">{t("continue_shopping")}</Button></Link>
                {customer && <Link to="/account"><Button variant="outline" className="rounded-full">{t("order_history")}</Button></Link>}
            </div>
        </div>
    );
}
