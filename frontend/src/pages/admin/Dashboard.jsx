import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Banknote, Clock, Package, DatabaseBackup } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const COLORS = ["#164E2E", "#D95D39", "#F59E0B", "#3B82F6", "#8B5CF6"];
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function Dashboard() {
    const qc = useQueryClient();
    const [backing, setBacking] = useState(false);
    const { data, isLoading } = useQuery({
        queryKey: ["admin-summary"],
        queryFn: async () => (await api.get("/admin/dashboard/summary")).data,
    });
    const { data: backup } = useQuery({ queryKey: ["backup-status"], queryFn: async () => (await api.get("/admin/backup/status")).data });

    const doBackup = async () => {
        setBacking(true);
        try {
            await api.post("/admin/backup/now");
            toast.success("Backup created");
            qc.invalidateQueries({ queryKey: ["backup-status"] });
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Backup failed");
        } finally {
            setBacking(false);
        }
    };

    if (isLoading || !data) return <div className="grid sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

    const kpis = [
        { label: "Total Revenue", value: formatKD(data.revenue), icon: Banknote, color: "text-forest" },
        { label: "Total Orders", value: data.total_orders, icon: ShoppingCart, color: "text-terracotta" },
        { label: "Pending Orders", value: data.pending_orders, icon: Clock, color: "text-amber-500" },
        { label: "Active Products", value: data.products_count, icon: Package, color: "text-blue-500" },
    ];

    return (
        <div className="space-y-6" data-testid="admin-dashboard">
            <h1 className="font-heading font-bold text-2xl">Dashboard</h1>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-2xl bg-white border border-border p-5" data-testid={`kpi-${k.label.replace(/\s/g, '-').toLowerCase()}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{k.label}</span>
                            <k.icon className={`w-5 h-5 ${k.color}`} />
                        </div>
                        <p className="font-heading font-bold text-2xl mt-2">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl bg-white border border-border p-5">
                    <h2 className="font-heading font-semibold mb-4">Revenue — last 7 days</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.revenue_series}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => formatKD(v)} />
                            <Bar dataKey="revenue" fill="#164E2E" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="rounded-2xl bg-white border border-border p-5">
                    <h2 className="font-heading font-semibold mb-4">Orders by Status</h2>
                    {data.status_breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={data.status_breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                                    {data.status_breakdown.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-20">No data yet</p>}
                </div>
            </div>

            <div className="rounded-2xl bg-white border border-border p-5">
                <h2 className="font-heading font-semibold mb-4">Recent Orders</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-start text-muted-foreground border-b border-border">
                            <th className="text-start font-medium py-2">Order</th><th className="text-start font-medium">Customer</th>
                            <th className="text-start font-medium">Total</th><th className="text-start font-medium">Payment</th><th className="text-start font-medium">Status</th>
                        </tr></thead>
                        <tbody>
                            {data.recent_orders.map((o) => (
                                <tr key={o.id} className="border-b border-border/60">
                                    <td className="py-2.5 font-mono text-xs">{o.order_no}</td>
                                    <td>{o.customer.name}</td>
                                    <td className="font-semibold">{formatKD(o.net_payable)}</td>
                                    <td>{o.payment_method}</td>
                                    <td><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{o.order_status}</span></td>
                                </tr>
                            ))}
                            {data.recent_orders.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No orders yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="rounded-2xl bg-white border border-border p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="font-heading font-semibold flex items-center gap-2"><DatabaseBackup className="w-5 h-5 text-forest" /> Backup</h2>
                        {backup?.last_backup?.at ? (
                            <p className="text-xs text-muted-foreground mt-1">
                                Last backup: {new Date(backup.last_backup.at).toLocaleString()} ({backup.last_backup.trigger})
                                {typeof backup.last_backup.db_size === "number" && ` · DB ${fmtSize(backup.last_backup.db_size)}`}
                                {typeof backup.last_backup.uploads_size === "number" && ` · images ${fmtSize(backup.last_backup.uploads_size)}`}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1">Runs automatically every night at 3 AM. No manual backup yet.</p>
                        )}
                    </div>
                    <Button onClick={doBackup} disabled={backing} variant="outline" data-testid="backup-now-button" className="rounded-full gap-1.5">
                        <DatabaseBackup className={`w-4 h-4 ${backing ? "animate-pulse" : ""}`} /> {backing ? "Backing up…" : "Backup Now"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
