import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const empty = { name_en: "", name_ar: "", slug: "", image: "", sort_order: 0, is_active: true };

export default function Categories() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);
    const [imageFile, setImageFile] = useState(null);     // newly picked file (uploaded on Save)
    const [imagePreview, setImagePreview] = useState("");  // local object URL for the new file
    const [uploading, setUploading] = useState(false);

    const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await api.get("/admin/categories")).data });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const resetImage = () => {
        setImageFile(null);
        setImagePreview((p) => { if (p) URL.revokeObjectURL(p); return ""; });
    };
    const openNew = () => { resetImage(); setForm(empty); setEditId(null); setOpen(true); };
    const openEdit = (c) => { resetImage(); setForm({ ...empty, ...c }); setEditId(c.id); setOpen(true); };

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const pickImage = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";  // allow re-picking the same file later
        if (!file) return;
        if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Please choose a JPG, JPEG, PNG, or WEBP image."); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error("Image is too large — maximum size is 5 MB."); return; }
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const save = async () => {
        try {
            // If a new image was picked, upload it now; otherwise keep the existing image unchanged.
            let imageUrl = form.image;
            if (imageFile) {
                setUploading(true);
                const fd = new FormData();
                fd.append("file", imageFile);
                const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
                imageUrl = data.url;
                setUploading(false);
            }
            const payload = { ...form, image: imageUrl, sort_order: Number(form.sort_order) };
            if (editId) await api.put(`/admin/categories/${editId}`, payload);
            else await api.post("/admin/categories", payload);
            toast.success("Saved");
            setOpen(false);
            resetImage();
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
            qc.invalidateQueries({ queryKey: ["categories"] });
        } catch { setUploading(false); toast.error("Failed to save"); }
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
                            <div><p className="font-semibold">{c.name_en}{c.is_active === false && <span className="ms-2 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground align-middle">Hidden</span>}</p><p className="text-xs text-muted-foreground" dir="rtl">{c.name_ar}</p></div>
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
                        <Fld label="Category Image">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-border shrink-0 grid place-items-center">
                                    {(imagePreview || form.image)
                                        ? <img src={imagePreview || form.image} alt="" className="w-full h-full object-cover" />
                                        : <ImageIcon className="w-5 h-5 text-muted-foreground/50" />}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm cursor-pointer hover:bg-secondary ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                                        <Upload className="w-4 h-4" /> {(imagePreview || form.image) ? "Change Image" : "Choose Image"}
                                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} data-testid="cat-image-input" />
                                    </label>
                                    {imageFile && (
                                        <button type="button" onClick={resetImage} data-testid="cat-image-remove" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /> Remove</button>
                                    )}
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5">JPG, JPEG, PNG or WEBP · max 5 MB</p>
                        </Fld>
                        <Fld label="Sort Order"><Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></Fld>
                        <label className="flex items-center gap-2 text-sm pt-1"><Switch data-testid="cat-active" checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /> Active (visible on store)</label>
                    </div>
                    <DialogFooter><Button onClick={save} disabled={uploading} data-testid="save-category" className="bg-forest hover:bg-forest-dark rounded-full">{uploading ? "Uploading…" : "Save"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
