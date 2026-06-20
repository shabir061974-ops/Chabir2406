import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { formatKD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const empty = { name_en: "", name_ar: "", category: "", price: 0, stock: 0, images: [], unit_en: "each", unit_ar: "حبة", barcode: "", is_featured: false, is_promotional: false, discount: 0, is_active: true };

export default function Products() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);

    const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await api.get("/admin/products")).data });
    const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await api.get("/categories")).data });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
    const openEdit = (p) => { setForm({ ...empty, ...p }); setEditId(p.id); setOpen(true); };

    const save = async () => {
        const payload = { ...form, price: Number(form.price), stock: Number(form.stock), discount: Number(form.discount), images: typeof form.images === "string" ? form.images.split(",").map((s) => s.trim()).filter(Boolean) : form.images };
        try {
            if (editId) await api.put(`/admin/products/${editId}`, payload);
            else await api.post("/admin/products", payload);
            toast.success("Saved");
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-products"] });
        } catch (e) { toast.error("Failed to save"); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this product?")) return;
        await api.delete(`/admin/products/${id}`);
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: ["admin-products"] });
    };

    return (
        <div className="space-y-5" data-testid="admin-products">
            <div className="flex items-center justify-between">
                <h1 className="font-heading font-bold text-2xl">Products</h1>
                <Button onClick={openNew} data-testid="add-product-button" className="rounded-full bg-forest hover:bg-forest-dark gap-1.5"><Plus className="w-4 h-4" /> Add Product</Button>
            </div>

            <div className="rounded-2xl bg-white border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-muted-foreground border-b border-border bg-secondary/40">
                            <th className="text-start font-medium p-3">Product</th><th className="text-start font-medium">Category</th>
                            <th className="text-start font-medium">Price</th><th className="text-start font-medium">Stock</th>
                            <th className="text-start font-medium">Source</th><th className="text-end font-medium p-3">Actions</th>
                        </tr></thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id} className="border-b border-border/60" data-testid={`product-row-${p.id}`}>
                                    <td className="p-3 flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary shrink-0">{(p.images || [])[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
                                        <span>{p.name_en}<br /><span className="text-xs text-muted-foreground" dir="rtl">{p.name_ar}</span></span>
                                    </td>
                                    <td className="text-muted-foreground">{p.category}</td>
                                    <td className="font-semibold">{formatKD(p.price)}{p.discount > 0 && <span className="text-xs text-terracotta ms-1">-{p.discount}%</span>}</td>
                                    <td>{p.stock}</td>
                                    <td><span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{p.source}</span></td>
                                    <td className="text-end p-3 whitespace-nowrap">
                                        <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-forest p-1.5" data-testid={`edit-product-${p.id}`}><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive p-1.5" data-testid={`delete-product-${p.id}`}><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <Fld label="Name (EN)"><Input data-testid="prod-name-en" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} /></Fld>
                        <Fld label="Name (AR)"><Input data-testid="prod-name-ar" dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Fld>
                        <Fld label="Category">
                            <Select value={form.category} onValueChange={(v) => set("category", v)}>
                                <SelectTrigger data-testid="prod-category"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name_en}</SelectItem>)}</SelectContent>
                            </Select>
                        </Fld>
                        <Fld label="Barcode"><Input value={form.barcode || ""} onChange={(e) => set("barcode", e.target.value)} /></Fld>
                        <Fld label="Price (KD)"><Input data-testid="prod-price" type="number" step="0.001" value={form.price} onChange={(e) => set("price", e.target.value)} /></Fld>
                        <Fld label="Stock"><Input data-testid="prod-stock" type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Fld>
                        <Fld label="Unit (EN)"><Input value={form.unit_en} onChange={(e) => set("unit_en", e.target.value)} /></Fld>
                        <Fld label="Discount %"><Input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} /></Fld>
                        <div className="col-span-2"><Fld label="Image URL"><Input data-testid="prod-image" value={Array.isArray(form.images) ? form.images.join(", ") : form.images} onChange={(e) => set("images", e.target.value)} /></Fld></div>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} /> Featured</label>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_promotional} onCheckedChange={(v) => set("is_promotional", v)} /> On Sale</label>
                    </div>
                    <DialogFooter><Button onClick={save} data-testid="save-product" className="bg-forest hover:bg-forest-dark rounded-full">Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
