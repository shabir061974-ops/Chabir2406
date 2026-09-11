import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, RefreshCw } from "lucide-react";
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
    const [uploading, setUploading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await api.get("/admin/products")).data });
    // Admin can assign a product to ANY category (active or not), so load the full admin list.
    const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await api.get("/admin/categories")).data });
    const { data: syncStatus } = useQuery({ queryKey: ["sync-status"], queryFn: async () => (await api.get("/admin/sync/status")).data });

    const syncOracle = async () => {
        setSyncing(true);
        try {
            const { data } = await api.post("/admin/sync/oracle-to-mongo");
            toast.success(`Synced ${data.synced} products from Oracle`);
            qc.invalidateQueries({ queryKey: ["admin-products"] });
            qc.invalidateQueries({ queryKey: ["sync-status"] });
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Oracle sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const uploadImage = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file later
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        setUploading(true);
        try {
            const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
            setForm((f) => {
                const current = Array.isArray(f.images) ? f.images : String(f.images || "").split(",").map((s) => s.trim()).filter(Boolean);
                return { ...f, images: [...current, data.url] };
            });
            toast.success("Image uploaded");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };
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
                <div>
                    <h1 className="font-heading font-bold text-2xl">Products</h1>
                    {syncStatus?.last_oracle_sync?.at && (
                        <div className="text-xs text-muted-foreground mt-0.5" data-testid="oracle-sync-summary">
                            <p>
                                Last Oracle sync: {new Date(syncStatus.last_oracle_sync.at).toLocaleString()}
                                {syncStatus.last_oracle_sync.duration_seconds != null && ` · ${syncStatus.last_oracle_sync.duration_seconds}s`}
                            </p>
                            <p>
                                Inserted {syncStatus.last_oracle_sync.inserted ?? 0} · Updated {syncStatus.last_oracle_sync.updated ?? 0} ·
                                {" "}Unchanged {syncStatus.last_oracle_sync.unchanged ?? 0} · Removed {syncStatus.last_oracle_sync.removed ?? 0}
                                {" "}({syncStatus.last_oracle_sync.removed_action || "deactivate"})
                            </p>
                            {syncStatus.last_oracle_sync.errors?.length > 0 && (
                                <p className="text-destructive">
                                    {syncStatus.last_oracle_sync.errors.length} error(s) — e.g. PRODUCT_ID {syncStatus.last_oracle_sync.errors[0].product_id}: {syncStatus.last_oracle_sync.errors[0].error}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={syncOracle} disabled={syncing} variant="outline" data-testid="sync-oracle-button" className="rounded-full gap-1.5">
                        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing…" : "Sync from Oracle"}
                    </Button>
                    <Button onClick={openNew} data-testid="add-product-button" className="rounded-full bg-forest hover:bg-forest-dark gap-1.5"><Plus className="w-4 h-4" /> Add Product</Button>
                </div>
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
                                <SelectContent>
                                    {/* Keep the product's current category selectable even if it isn't an active category (e.g. Oracle "uncategorized"). */}
                                    {form.category && !categories.some((c) => c.slug === form.category) && (
                                        <SelectItem value={form.category}>{form.category}</SelectItem>
                                    )}
                                    {categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name_en}{c.is_active === false ? " (inactive)" : ""}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Fld>
                        <Fld label="Barcode"><Input value={form.barcode || ""} onChange={(e) => set("barcode", e.target.value)} /></Fld>
                        <Fld label="Price (KD)"><Input data-testid="prod-price" type="number" step="0.001" value={form.price} onChange={(e) => set("price", e.target.value)} /></Fld>
                        <Fld label="Stock"><Input data-testid="prod-stock" type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Fld>
                        <Fld label="Unit (EN)"><Input value={form.unit_en} onChange={(e) => set("unit_en", e.target.value)} /></Fld>
                        <Fld label="Discount %"><Input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} /></Fld>
                        <div className="col-span-2">
                            <Fld label="Images">
                                <div className="flex gap-2">
                                    <Input data-testid="prod-image" placeholder="Image URL(s), comma-separated" value={Array.isArray(form.images) ? form.images.join(", ") : form.images} onChange={(e) => set("images", e.target.value)} />
                                    <label className={`shrink-0 inline-flex items-center gap-1.5 px-3 rounded-md border border-border text-sm cursor-pointer hover:bg-secondary ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                                        <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload"}
                                        <input type="file" accept="image/*" className="hidden" onChange={uploadImage} data-testid="prod-image-upload" />
                                    </label>
                                </div>
                                {(Array.isArray(form.images) ? form.images : String(form.images || "").split(",").map((s) => s.trim()).filter(Boolean)).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(Array.isArray(form.images) ? form.images : String(form.images || "").split(",").map((s) => s.trim()).filter(Boolean)).map((url, i) => (
                                            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border bg-secondary group">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => { const list = (Array.isArray(form.images) ? form.images : String(form.images || "").split(",").map((s) => s.trim()).filter(Boolean)); set("images", list.filter((_, j) => j !== i)); }} className="absolute top-0.5 end-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Fld>
                        </div>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} /> Featured</label>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_promotional} onCheckedChange={(v) => set("is_promotional", v)} /> On Sale</label>
                    </div>
                    <DialogFooter><Button onClick={save} data-testid="save-product" className="bg-forest hover:bg-forest-dark rounded-full">Save</Button></DialogFooter>

                    {editId && <ProductAddonOverride productId={editId} />}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ProductAddonOverride({ productId }) {
    const qc = useQueryClient();
    const { data: groups = [] } = useQuery({ queryKey: ["admin-addon-groups"], queryFn: async () => (await api.get("/admin/addon-groups")).data });
    const { data } = useQuery({
        queryKey: ["product-addon-groups", productId],
        queryFn: async () => (await api.get(`/admin/products/${productId}/addon-groups`)).data,
    });
    const [selectedIds, setSelectedIds] = useState(null);
    const ids = selectedIds ?? data?.group_ids ?? [];

    const toggle = (gid) => setSelectedIds((prev) => {
        const base = prev ?? data?.group_ids ?? [];
        return base.includes(gid) ? base.filter((i) => i !== gid) : [...base, gid];
    });

    const save = async () => {
        try {
            await api.put(`/admin/products/${productId}/addon-groups`, { group_ids: ids });
            toast.success("Add-on mapping saved");
            qc.invalidateQueries({ queryKey: ["product-addon-groups", productId] });
            setSelectedIds(null);
        } catch { toast.error("Failed to save"); }
    };

    const clearOverride = async () => {
        await api.delete(`/admin/products/${productId}/addon-groups`);
        toast.success("Reverted to category default");
        qc.invalidateQueries({ queryKey: ["product-addon-groups", productId] });
        setSelectedIds(null);
    };

    if (groups.length === 0) return null;

    return (
        <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Add-on Groups (override category default)</h3>
                {data?.override && <button onClick={clearOverride} data-testid="clear-addon-override" className="text-xs text-muted-foreground hover:text-destructive">Clear override</button>}
            </div>
            <p className="text-xs text-muted-foreground mb-2">{data?.override ? "This product has its own add-on selection below." : "Currently inheriting its category's add-on groups. Pick groups here to override just this product."}</p>
            <div className="flex flex-wrap gap-2 mb-3">
                {groups.map((g) => {
                    const active = ids.includes(g.id);
                    return (
                        <button key={g.id} type="button" onClick={() => toggle(g.id)} data-testid={`product-addon-toggle-${g.id}`}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${active ? "bg-forest text-white border-forest" : "bg-secondary text-muted-foreground border-transparent"}`}>
                            {g.name_en}
                        </button>
                    );
                })}
            </div>
            <Button size="sm" onClick={save} disabled={selectedIds === null} data-testid="save-product-addon-override" className="rounded-full bg-forest hover:bg-forest-dark">Save Add-on Mapping</Button>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
