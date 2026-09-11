import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";

export default function Customers() {
    const { data: customers = [] } = useQuery({ queryKey: ["admin-customers"], queryFn: async () => (await api.get("/admin/customers")).data });

    return (
        <div className="space-y-5" data-testid="admin-customers">
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><Users className="w-6 h-6 text-forest" /> Customers</h1>
            <div className="rounded-2xl bg-white border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-muted-foreground border-b border-border bg-secondary/40">
                            <th className="text-start font-medium p-3">Name</th><th className="text-start font-medium">Phone</th>
                            <th className="text-start font-medium">Area</th><th className="text-start font-medium">Orders</th><th className="text-start font-medium">Total Spent</th>
                        </tr></thead>
                        <tbody>
                            {customers.map((c, i) => (
                                <tr key={c.phone || i} className="border-b border-border/60" data-testid={`customer-row-${i}`}>
                                    <td className="p-3 font-medium">{c.name}</td>
                                    <td className="text-muted-foreground">{c.phone}</td>
                                    <td className="text-muted-foreground">{c.area}</td>
                                    <td>{c.orders}</td>
                                    <td className="font-semibold">{formatKD(c.total_spent)}</td>
                                </tr>
                            ))}
                            {customers.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No customers yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
