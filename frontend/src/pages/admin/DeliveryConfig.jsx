import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Loader2, X, Plus } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function DeliveryConfig() {
    const { data } = useQuery({ queryKey: ["admin-delivery"], queryFn: async () => (await api.get("/admin/delivery-config")).data });
    const [form, setForm] = useState(null);
    const [slot, setSlot] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (data) setForm({ charge: data.charge ?? 0, min_order_amount: data.min_order_amount ?? 0, free_delivery_threshold: data.free_delivery_threshold ?? 0, time_slots: data.time_slots || [], coverage_area: data.coverage_area || "" }); }, [data]);

    if (!form) return <Loader2 className="w-6 h-6 animate-spin text-forest" />;
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const addSlot = () => { if (slot.trim()) { set("time_slots", [...form.time_slots, slot.trim()]); setSlot(""); } };
    const removeSlot = (i) => set("time_slots", form.time_slots.filter((_, idx) => idx !== i));

    const save = async () => {
        setSaving(true);
        try {
            await api.put("/admin/delivery-config", { ...form, charge: Number(form.charge), min_order_amount: Number(form.min_order_amount), free_delivery_threshold: Number(form.free_delivery_threshold) });
            toast.success("Delivery settings saved");
        } catch { toast.error("Failed to save"); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-5 max-w-2xl" data-testid="admin-delivery">
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2"><Truck className="w-6 h-6 text-forest" /> Delivery Configuration</h1>
            <div className="rounded-2xl bg-white border border-border p-6 space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                    <Fld label="Delivery Charge (KD)"><Input data-testid="delivery-charge" type="number" step="0.001" value={form.charge} onChange={(e) => set("charge", e.target.value)} /></Fld>
                    <Fld label="Min Order (KD)"><Input data-testid="min-order" type="number" step="0.001" value={form.min_order_amount} onChange={(e) => set("min_order_amount", e.target.value)} /></Fld>
                    <Fld label="Free Delivery Over (KD)"><Input data-testid="free-threshold" type="number" step="0.001" value={form.free_delivery_threshold} onChange={(e) => set("free_delivery_threshold", e.target.value)} /></Fld>
                </div>
                <Fld label="Coverage Area"><Input value={form.coverage_area} onChange={(e) => set("coverage_area", e.target.value)} /></Fld>
                <div>
                    <Label className="text-xs mb-1 block text-muted-foreground">Time Slots</Label>
                    <div className="flex gap-2 mb-2">
                        <Input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="09:00 - 12:00" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSlot())} />
                        <Button variant="outline" onClick={addSlot} data-testid="add-slot"><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {form.time_slots.map((s, i) => (
                            <span key={`${s}-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm">{s}<button onClick={() => removeSlot(i)}><X className="w-3.5 h-3.5" /></button></span>
                        ))}
                    </div>
                </div>
                <Button onClick={save} disabled={saving} data-testid="save-delivery" className="rounded-full bg-forest hover:bg-forest-dark">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}</Button>
            </div>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
