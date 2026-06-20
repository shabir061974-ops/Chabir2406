import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUSES = ["pending", "confirmed", "processing", "delivered", "cancelled"];
const statusColor = (s) => ({
    pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
}[s] || "bg-secondary");

export default function Orders() {
    const qc = useQueryClient();
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState(null);

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ["admin-orders", status, q],
        queryFn: async () => (await api.get(`/admin/orders?status=${status}&q=${encodeURIComponent(q)}`)).data,
    });

    const updateStatus = async (order_no, newStatus) => {
        try {
            await api.patch(`/admin/orders/${order_no}/status`, { order_status: newStatus });
            toast.success("Status updated");
            qc.invalidateQueries({ queryKey: ["admin-orders"] });
            qc.invalidateQueries({ queryKey: ["admin-summary"] });
            if (selected?.order_no === order_no) setSelected({ ...selected, order_status: newStatus });
        } catch { toast.error("Failed to update"); }
    };

    return (
        <div className="space-y-5" data-testid="admin-orders">
            <h1 className="font-heading font-bold text-2xl">Orders</h1>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                    <Input data-testid="orders-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no, name, phone" className="ps-9 bg-white" />
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-44 bg-white" data-testid="orders-status-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-2xl bg-white border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-muted-foreground border-b border-border bg-secondary/40">
                            <th className="text-start font-medium p-3">Order</th><th className="text-start font-medium">Customer</th>
                            <th className="text-start font-medium">Items</th><th className="text-start font-medium">Total</th>
                            <th className="text-start font-medium">Payment</th><th className="text-start font-medium">Status</th>
                        </tr></thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} className="border-b border-border/60 hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(o)} data-testid={`order-row-${o.order_no}`}>
                                    <td className="p-3 font-mono text-xs">{o.order_no}</td>
                                    <td>{o.customer.name}<br /><span className="text-xs text-muted-foreground">{o.customer.phone}</span></td>
                                    <td>{o.items.length}</td>
                                    <td className="font-semibold">{formatKD(o.net_payable)}</td>
                                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-secondary'}`}>{o.payment_method}</span></td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <Select value={o.order_status} onValueChange={(v) => updateStatus(o.order_no, v)}>
                                            <SelectTrigger className={`w-32 h-8 text-xs border-0 ${statusColor(o.order_status)}`} data-testid={`status-select-${o.order_no}`}><SelectValue /></SelectTrigger>
                                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && orders.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No orders found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
                <DialogContent className="max-w-lg" data-testid="order-detail-dialog">
                    {selected && (
                        <>
                            <DialogHeader><DialogTitle className="font-mono">{selected.order_no}</DialogTitle></DialogHeader>
                            <div className="space-y-3 text-sm">
                                <div className="bg-secondary/40 rounded-xl p-3">
                                    <p className="font-semibold">{selected.customer.name} · {selected.customer.phone}</p>
                                    <p className="text-muted-foreground">{selected.customer.address}, {selected.customer.area}</p>
                                    {selected.customer.notes && <p className="text-muted-foreground mt-1">Note: {selected.customer.notes}</p>}
                                    {selected.delivery_slot && <p className="text-muted-foreground mt-1">Slot: {selected.delivery_slot}</p>}
                                </div>
                                <div className="space-y-2">
                                    {selected.items.map((it, i) => (
                                        <div key={`${it.product_id}-${i}`} className="flex justify-between"><span>{it.name_en} × {it.qty}</span><span className="font-semibold">{formatKD(it.line_total)}</span></div>
                                    ))}
                                </div>
                                <div className="border-t border-border pt-2 space-y-1">
                                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatKD(selected.subtotal)}</span></div>
                                    {selected.discount_amount > 0 && <div className="flex justify-between text-terracotta"><span>Discount</span><span>- {formatKD(selected.discount_amount)}</span></div>}
                                    <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{formatKD(selected.delivery_charge)}</span></div>
                                    <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatKD(selected.net_payable)}</span></div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
