import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const empty = { name_en: "", name_ar: "", slug: "", image: "", sort_order: 0, is_active: true };

export default function Categories() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);

    const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await api.get("/admin/categories")).data });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
    const openEdit = (c) => { setForm({ ...empty, ...c }); setEditId(c.id); setOpen(true); };

    const save = async () => {
        const payload = { ...form, sort_order: Number(form.sort_order) };
        try {
            if (editId) await api.put(`/admin/categories/${editId}`, payload);
            else await api.post("/admin/categories", payload);
            toast.success("Saved");
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
            qc.invalidateQueries({ queryKey: ["categories"] });
        } catch { toast.error("Failed to save"); }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete category?")) return;
        await api.delete(`/admin/categories/${id}`);
        toast.success("Deleted");
        qc.invalidateQueries({ queryKey: ["admin-categories"] });
        qc.invalidateQueries({ queryKey: ["categories"] });
    };

    return (
        <div className="space-y-5" data-testid="admin-categories">
            <div className="flex items-center justify-between">
                <h1 className="font-heading font-bold text-2xl">Categories</h1>
                <Button onClick={openNew} data-testid="add-category-button" className="rounded-full bg-forest hover:bg-forest-dark gap-1.5"><Plus className="w-4 h-4" /> Add Category</Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                    <div key={c.id} className="rounded-2xl bg-white border border-border overflow-hidden" data-testid={`category-card-${c.slug}`}>
                        <div className="h-28 bg-secondary">{c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}</div>
                        <div className="p-4 flex items-center justify-between">
                            <div><p className="font-semibold">{c.name_en}</p><p className="text-xs text-muted-foreground" dir="rtl">{c.name_ar}</p></div>
                            <div className="flex">
                                <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-forest p-1.5"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent data-testid="category-dialog">
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <Fld label="Name (EN)"><Input data-testid="cat-name-en" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} /></Fld>
                        <Fld label="Name (AR)"><Input data-testid="cat-name-ar" dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Fld>
                        <Fld label="Slug"><Input data-testid="cat-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="e.g. fruits-vegetables" /></Fld>
                        <Fld label="Image URL"><Input value={form.image || ""} onChange={(e) => set("image", e.target.value)} /></Fld>
                        <Fld label="Sort Order"><Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></Fld>
                    </div>
                    <DialogFooter><Button onClick={save} data-testid="save-category" className="bg-forest hover:bg-forest-dark rounded-full">Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
