import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

export default function NotificationBell() {
    const { t } = useLang();
    const qc = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [marking, setMarking] = useState(null);

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["admin-notifications"],
        queryFn: async () => (await api.get("/admin/notifications")).data,
        refetchInterval: 5000, // Poll every 5 seconds
        staleTime: 0,
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (notifId) => {
        setMarking(notifId);
        try {
            await api.patch(`/admin/notifications/${notifId}/read`);
            qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        } catch (e) {
            console.error("Failed to mark notification as read:", e);
        } finally {
            setMarking(null);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch("/admin/notifications/read-all");
            qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        } catch (e) {
            console.error("Failed to mark all as read:", e);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-muted-foreground hover:text-foreground transition"
                title={t("notifications")}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-destructive text-white text-xs font-bold rounded-full grid place-items-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-border rounded-lg shadow-lg z-50">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h3 className="font-semibold">{t("notifications")}</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">{t("notifications_empty")}</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {notifications.map((notif) => (
                                    <NotificationItem
                                        key={notif.id}
                                        notif={notif}
                                        onMarkRead={() => markAsRead(notif.id)}
                                        isMarking={marking === notif.id}
                                        t={t}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && unreadCount > 0 && (
                        <div className="p-3 border-t border-border text-center">
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-forest hover:underline font-medium"
                            >
                                {t("notification_mark_all_read")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function NotificationItem({ notif, onMarkRead, isMarking, t }) {
    const isNewOrder = notif.type === "new_order";
    const isCustomerArrived = notif.type === "customer_arrived";

    return (
        <div className={`p-4 hover:bg-secondary/50 cursor-pointer transition ${notif.read ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1">
                        {isNewOrder && t("notification_new_order")}
                        {isCustomerArrived && t("notification_customer_arrived")}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <div>{t("notification_order_number")} {notif.order_no}</div>
                        <div>{t("notification_customer")}: {notif.customer_name}</div>
                        {notif.fulfillment_type && <div>{t("notification_fulfillment")}: {notif.fulfillment_type}</div>}
                        {notif.vehicle_number && <div>{t("notification_vehicle")}: {notif.vehicle_number} ({notif.vehicle_color})</div>}
                        {notif.payment_method && <div>{t("notification_payment")}: {notif.payment_method}</div>}
                        <div className="text-xs text-muted-foreground/70">
                            {new Date(notif.created_at).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                {!notif.read && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead();
                        }}
                        disabled={isMarking}
                        className="text-xs px-2 py-1 bg-forest text-white rounded hover:bg-forest-dark disabled:opacity-50 whitespace-nowrap"
                    >
                        {isMarking ? "..." : t("notification_mark_read")}
                    </button>
                )}
            </div>
        </div>
    );
}
