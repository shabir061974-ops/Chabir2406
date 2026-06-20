import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Banknote, ShoppingCart, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";

const PERIODS = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]];

export default function Reports() {
    const [period, setPeriod] = useState("weekly");
    const { data } = useQuery({ queryKey: ["admin-reports", period], queryFn: async () => (await api.get(`/admin/reports?period=${period}`)).data });

    const exportCsv = () => {
        if (!data?.orders?.length) return;
        const rows = [["Order No", "Customer", "Phone", "Payment", "Status", "Total (KD)", "Placed At"]];
        data.orders.forEach((o) => rows.push([o.order_no, o.customer.name, o.customer.phone, o.payment_method, o.order_status, Number(o.net_payable).toFixed(3), o.placed_at]));
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url; a.download = `faiha-report-${period}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (!data) return <div className="text-muted-foreground">Loading…</div>;

    const kpis = [
        { label: "Revenue", value: formatKD(data.total_revenue), icon: Banknote },
        { label: "Orders", value: data.total_orders, icon: ShoppingCart },
        { label: "Avg Order", value: formatKD(data.avg_order_value), icon: TrendingUp },
    ];

    return (
        <div className="space-y-5" data-testid="admin-reports">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><BarChart3 className="w-6 h-6 text-forest" /> Reports</h1>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-full bg-secondary p-1">
                        {PERIODS.map(([v, l]) => (
                            <button key={v} onClick={() => setPeriod(v)} data-testid={`period-${v}`}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium ${period === v ? "bg-forest text-white" : "text-muted-foreground"}`}>{l}</button>
                        ))}
                    </div>
                    <Button onClick={exportCsv} variant="outline" data-testid="export-csv" className="gap-1.5"><Download className="w-4 h-4" /> Export</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-2xl bg-white border border-border p-5">
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{k.label}</span><k.icon className="w-5 h-5 text-forest" /></div>
                        <p className="font-heading font-bold text-2xl mt-2">{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl bg-white border border-border p-5">
                <h2 className="font-heading font-semibold mb-4">Top Products</h2>
                {data.top_products.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.top_products} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="qty" fill="#D95D39" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-16">No sales in this period</p>}
            </div>
        </div>
    );
}
