import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BarChart3, Banknote, ShoppingCart, TrendingUp, Package, Users, Download, FileText } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";
import { generateSalesReportPdf } from "@/lib/reportPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#164E2E", "#D95D39", "#F59E0B", "#3B82F6", "#8B5CF6"];
const ISO = "YYYY-MM-DD";

const PRESETS = [
    { key: "today", label: "Today", range: () => [dayjs(), dayjs()] },
    { key: "yesterday", label: "Yesterday", range: () => [dayjs().subtract(1, "day"), dayjs().subtract(1, "day")] },
    { key: "last7", label: "Last 7 Days", range: () => [dayjs().subtract(6, "day"), dayjs()] },
    { key: "last30", label: "Last 30 Days", range: () => [dayjs().subtract(29, "day"), dayjs()] },
    { key: "thisMonth", label: "Current Month", range: () => [dayjs().startOf("month"), dayjs()] },
    { key: "prevMonth", label: "Previous Month", range: () => [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
];

function csvCell(v) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export default function Reports() {
    const today = dayjs().format(ISO);
    const [dateFrom, setDateFrom] = useState(dayjs().subtract(6, "day").format(ISO));
    const [dateTo, setDateTo] = useState(today);
    const [activePreset, setActivePreset] = useState("last7");
    const [range, setRange] = useState({ from: dayjs().subtract(6, "day").format(ISO), to: today });
    const [exportingPdf, setExportingPdf] = useState(false);

    const trendRef = useRef(null);
    const topProductsRef = useRef(null);
    const paymentDistRef = useRef(null);
    const statusDistRef = useRef(null);

    const { data: report, isLoading, isFetching } = useQuery({
        queryKey: ["admin-reports-sales", range.from, range.to],
        queryFn: async () => (await api.get(`/admin/reports/sales?date_from=${range.from}&date_to=${range.to}`)).data,
    });

    const applyPreset = (preset) => {
        const [from, to] = preset.range();
        setDateFrom(from.format(ISO));
        setDateTo(to.format(ISO));
        setActivePreset(preset.key);
    };

    const generate = () => {
        if (!dateFrom || !dateTo || dayjs(dateTo).isBefore(dayjs(dateFrom))) {
            toast.error("Please choose a valid date range (To date must be on or after From date).");
            return;
        }
        setRange({ from: dateFrom, to: dateTo });
    };

    const hasData = !!report && report.summary.total_orders > 0;

    const statusPie = useMemo(() => {
        if (!report) return [];
        return report.status_distribution.map((s) => ({ name: s.status, value: s.count }));
    }, [report]);

    const paymentPie = useMemo(() => {
        if (!report) return [];
        return report.payment_summary.map((p) => ({ name: p.method, value: p.amount }));
    }, [report]);

    const exportCsv = () => {
        if (!hasData) return;
        const rows = [[
            "Order Number", "Order Date", "Customer Name", "Customer Phone", "Payment Method",
            "Order Status", "Products Purchased", "Quantity", "Subtotal", "Delivery Charge", "Discount", "Grand Total",
        ]];
        report.sales_details.forEach((o) => rows.push([
            o.order_no, o.placed_at, o.customer_name, o.customer_phone, o.payment_method,
            o.order_status, o.products, o.qty,
            Number(o.subtotal).toFixed(3), Number(o.delivery_charge).toFixed(3),
            Number(o.discount_amount).toFixed(3), Number(o.net_payable).toFixed(3),
        ]));
        const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
        const a = document.createElement("a");
        a.href = url; a.download = `faiha-sales-report-${range.from}_to_${range.to}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPdf = async () => {
        if (!hasData) {
            toast.error("No sales found for the selected period.");
            return;
        }
        setExportingPdf(true);
        try {
            await generateSalesReportPdf(report, {
                trend: trendRef.current,
                topProducts: topProductsRef.current,
                paymentDist: paymentDistRef.current,
                statusDist: statusDistRef.current,
            });
        } catch (e) {
            toast.error(e.message || "Failed to generate PDF");
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="space-y-5" data-testid="admin-reports">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><BarChart3 className="w-6 h-6 text-forest" /> Reports</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={exportCsv} disabled={!hasData} variant="outline" data-testid="export-csv" className="gap-1.5">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button onClick={exportPdf} disabled={!hasData || exportingPdf} data-testid="export-pdf" className="gap-1.5 bg-forest hover:bg-forest-dark">
                        <FileText className="w-4 h-4" /> {exportingPdf ? "Generating…" : "Export PDF"}
                    </Button>
                </div>
            </div>

            {/* Date range controls */}
            <div className="rounded-2xl bg-white border border-border p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                        <button key={p.key} onClick={() => applyPreset(p)} data-testid={`preset-${p.key}`}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${activePreset === p.key ? "bg-forest text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="rpt-from" className="text-xs">From Date</Label>
                        <Input id="rpt-from" type="date" value={dateFrom} max={dateTo || today}
                            onChange={(e) => { setDateFrom(e.target.value); setActivePreset("custom"); }}
                            data-testid="date-from" className="h-10 w-44" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="rpt-to" className="text-xs">To Date</Label>
                        <Input id="rpt-to" type="date" value={dateTo} min={dateFrom} max={today}
                            onChange={(e) => { setDateTo(e.target.value); setActivePreset("custom"); }}
                            data-testid="date-to" className="h-10 w-44" />
                    </div>
                    <Button onClick={generate} data-testid="generate-report" className="h-10 rounded-full bg-forest hover:bg-forest-dark">
                        Generate Report
                    </Button>
                    {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
            ) : !hasData ? (
                <div className="rounded-2xl bg-white border border-border py-24 text-center text-muted-foreground" data-testid="no-sales-message">
                    No sales found for the selected period.
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
                        {[
                            { label: "Total Orders", value: report.summary.total_orders, icon: ShoppingCart },
                            { label: "Completed Orders", value: report.summary.completed_orders, icon: ShoppingCart },
                            { label: "Cancelled Orders", value: report.summary.cancelled_orders, icon: ShoppingCart },
                            { label: "Pending Orders", value: report.summary.pending_orders, icon: ShoppingCart },
                            { label: "Total Revenue", value: formatKD(report.summary.total_revenue, report.currency), icon: Banknote },
                            { label: "Avg Order Value", value: formatKD(report.summary.avg_order_value, report.currency), icon: TrendingUp },
                            { label: "Products Sold", value: report.summary.total_products_sold, icon: Package },
                            { label: "Total Customers", value: report.summary.total_customers, icon: Users },
                        ].map((k) => (
                            <div key={k.label} className="rounded-2xl bg-white border border-border p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{k.label}</span>
                                    <k.icon className="w-4 h-4 text-forest shrink-0" />
                                </div>
                                <p className="font-heading font-bold text-xl mt-1.5">{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        <div ref={trendRef} className="rounded-2xl bg-white border border-border p-5">
                            <h2 className="font-heading font-semibold mb-4">Sales Trend (Revenue by Day)</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={report.daily_trend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v) => formatKD(v, report.currency)} />
                                    <Line type="monotone" dataKey="revenue" stroke="#164E2E" strokeWidth={2.5} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div ref={topProductsRef} className="rounded-2xl bg-white border border-border p-5">
                            <h2 className="font-heading font-semibold mb-4">Top Selling Products</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={report.top_products} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="qty" fill="#D95D39" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div ref={paymentDistRef} className="rounded-2xl bg-white border border-border p-5">
                            <h2 className="font-heading font-semibold mb-4">Payment Method Distribution</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={paymentPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                                        {paymentPie.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatKD(v, report.currency)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div ref={statusDistRef} className="rounded-2xl bg-white border border-border p-5">
                            <h2 className="font-heading font-semibold mb-4">Order Status Distribution</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                                        {statusPie.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sales details table */}
                    <div className="rounded-2xl bg-white border border-border p-5">
                        <h2 className="font-heading font-semibold mb-4">Sales Details</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="text-start text-muted-foreground border-b border-border">
                                        <th className="text-start font-medium py-2 pe-3">Order #</th>
                                        <th className="text-start font-medium pe-3">Date</th>
                                        <th className="text-start font-medium pe-3">Customer</th>
                                        <th className="text-start font-medium pe-3">Phone</th>
                                        <th className="text-start font-medium pe-3">Payment</th>
                                        <th className="text-start font-medium pe-3">Status</th>
                                        <th className="text-start font-medium pe-3">Products</th>
                                        <th className="text-start font-medium pe-3">Qty</th>
                                        <th className="text-start font-medium pe-3">Subtotal</th>
                                        <th className="text-start font-medium pe-3">Delivery</th>
                                        <th className="text-start font-medium pe-3">Discount</th>
                                        <th className="text-start font-medium">Grand Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.sales_details.map((o) => (
                                        <tr key={o.order_no} className="border-b border-border/60" data-testid={`report-row-${o.order_no}`}>
                                            <td className="py-2 pe-3 font-mono text-xs">{o.order_no}</td>
                                            <td className="pe-3">{new Date(o.placed_at).toLocaleString()}</td>
                                            <td className="pe-3">{o.customer_name}</td>
                                            <td className="pe-3">{o.customer_phone}</td>
                                            <td className="pe-3">{o.payment_method}</td>
                                            <td className="pe-3"><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{o.order_status}</span></td>
                                            <td className="pe-3 max-w-[220px] truncate" title={o.products}>{o.products}</td>
                                            <td className="pe-3">{o.qty}</td>
                                            <td className="pe-3">{formatKD(o.subtotal, report.currency)}</td>
                                            <td className="pe-3">{formatKD(o.delivery_charge, report.currency)}</td>
                                            <td className="pe-3">{formatKD(o.discount_amount, report.currency)}</td>
                                            <td className="font-semibold">{formatKD(o.net_payable, report.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
