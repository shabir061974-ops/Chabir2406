import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Ticket } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const empty = { code: "", type: "percent", value: 10, usage_limit: 1000, is_active: true, expires_at: "" };

export default function Coupons() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);

    const { data: coupons = [] } = useQuery({ queryKey: ["admin-coupons"], queryFn: async () => (await api.get("/admin/coupons")).data });
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = async () => {
        try {
            await api.post("/admin/coupons", { ...form, value: Number(form.value), usage_limit: Number(form.usage_limit), expires_at: form.expires_at || null });
            toast.success("Coupon created");
            setOpen(false); setForm(empty);
            qc.invalidateQueries({ queryKey: ["admin-coupons"] });
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    const remove = async (id) => {
        await api.delete(`/admin/coupons/${id}`);
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    };

    return (
        <div className="space-y-5" data-testid="admin-coupons">
            <div className="flex items-center justify-between">
                <h1 className="font-heading font-bold text-2xl">Coupons</h1>
                <Button onClick={() => { setForm(empty); setOpen(true); }} data-testid="add-coupon-button" className="rounded-full bg-forest hover:bg-forest-dark gap-1.5"><Plus className="w-4 h-4" /> Add Coupon</Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((c) => (
                    <div key={c.id} className="rounded-2xl bg-white border border-border p-5 flex items-center justify-between" data-testid={`coupon-${c.code}`}>
                        <div>
                            <div className="flex items-center gap-2"><Ticket className="w-4 h-4 text-terracotta" /><span className="font-heading font-bold text-lg font-mono">{c.code}</span></div>
                            <p className="text-sm text-muted-foreground mt-1">{c.type === "percent" ? `${c.value}% off` : `KD ${Number(c.value).toFixed(3)} off`} · used {c.used_count}/{c.usage_limit}{c.expires_at ? ` · expires ${String(c.expires_at).slice(0, 10)}` : ""}</p>
                        </div>
                        <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {coupons.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No coupons yet</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent data-testid="coupon-dialog">
                    <DialogHeader><DialogTitle>Add Coupon</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs mb-1 block text-muted-foreground">Code</Label><Input data-testid="coupon-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="FAIHA10" /></div>
                        <div><Label className="text-xs mb-1 block text-muted-foreground">Type</Label>
                            <Select value={form.type} onValueChange={(v) => set("type", v)}>
                                <SelectTrigger data-testid="coupon-type"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="percent">Percent (%)</SelectItem><SelectItem value="fixed">Fixed (KD)</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div><Label className="text-xs mb-1 block text-muted-foreground">Value</Label><Input data-testid="coupon-value" type="number" step="0.001" value={form.value} onChange={(e) => set("value", e.target.value)} /></div>
                        <div><Label className="text-xs mb-1 block text-muted-foreground">Usage Limit</Label><Input type="number" value={form.usage_limit} onChange={(e) => set("usage_limit", e.target.value)} /></div>
                        <div><Label className="text-xs mb-1 block text-muted-foreground">Expiry Date (optional — leave blank for no expiry)</Label><Input data-testid="coupon-expiry" type="date" value={form.expires_at || ""} onChange={(e) => set("expires_at", e.target.value)} /></div>
                    </div>
                    <DialogFooter><Button onClick={save} data-testid="save-coupon" className="bg-forest hover:bg-forest-dark rounded-full">Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
