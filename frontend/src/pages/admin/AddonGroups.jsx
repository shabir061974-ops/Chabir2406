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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const emptyGroup = { name_en: "", name_ar: "", selection_type: "single", is_required: false, display_order: 0, is_active: true };
const emptyItem = { group_id: "", name_en: "", name_ar: "", price: 0, display_order: 0, is_active: true, is_default: false };

export default function AddonGroups() {
    return (
        <div className="space-y-5" data-testid="admin-addons">
            <h1 className="font-heading font-bold text-2xl">Product Add-ons</h1>
            <Tabs defaultValue="groups">
                <TabsList>
                    <TabsTrigger value="groups" data-testid="addons-tab-groups">Groups &amp; Items</TabsTrigger>
                    <TabsTrigger value="categories" data-testid="addons-tab-categories">Category Mapping</TabsTrigger>
                </TabsList>
                <TabsContent value="groups"><GroupsPanel /></TabsContent>
                <TabsContent value="categories"><CategoryMappingPanel /></TabsContent>
            </Tabs>
        </div>
    );
}

function GroupsPanel() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyGroup);
    const [editId, setEditId] = useState(null);
    const [itemForm, setItemForm] = useState(emptyItem);
    const [editItemId, setEditItemId] = useState(null);

    const { data: groups = [] } = useQuery({ queryKey: ["admin-addon-groups"], queryFn: async () => (await api.get("/admin/addon-groups")).data });
    const { data: items = [] } = useQuery({
        queryKey: ["admin-addon-items", editId],
        queryFn: async () => (await api.get(`/admin/addon-items?group_id=${editId}`)).data,
        enabled: !!editId,
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setI = (k, v) => setItemForm((f) => ({ ...f, [k]: v }));

    const openNew = () => { setForm(emptyGroup); setEditId(null); setItemForm(emptyItem); setEditItemId(null); setOpen(true); };
    const openEdit = (g) => { setForm({ ...emptyGroup, ...g }); setEditId(g.id); setItemForm({ ...emptyItem, group_id: g.id }); setEditItemId(null); setOpen(true); };

    const saveGroup = async () => {
        const payload = { ...form, display_order: Number(form.display_order) };
        try {
            if (editId) await api.put(`/admin/addon-groups/${editId}`, payload);
            else { const { data } = await api.post("/admin/addon-groups", payload); setEditId(data.id); setItemForm({ ...emptyItem, group_id: data.id }); }
            toast.success("Saved");
            qc.invalidateQueries({ queryKey: ["admin-addon-groups"] });
        } catch { toast.error("Failed to save"); }
    };

    const removeGroup = async (id) => {
        if (!window.confirm("Delete this group and all its items?")) return;
        // Groups already used in past orders are deactivated instead of deleted (server-enforced),
        // so past orders can still be traced back to a real group record.
        const { data } = await api.delete(`/admin/addon-groups/${id}`);
        toast.success(data.soft_deleted ? data.message : "Deleted");
        qc.invalidateQueries({ queryKey: ["admin-addon-groups"] });
    };

    const openNewItem = () => { setItemForm({ ...emptyItem, group_id: editId }); setEditItemId(null); };
    const openEditItem = (it) => { setItemForm({ ...emptyItem, ...it }); setEditItemId(it.id); };

    const saveItem = async () => {
        const payload = { ...itemForm, group_id: editId, price: Number(itemForm.price), display_order: Number(itemForm.display_order) };
        try {
            if (editItemId) await api.put(`/admin/addon-items/${editItemId}`, payload);
            else await api.post("/admin/addon-items", payload);
            toast.success("Item saved");
            openNewItem();
            qc.invalidateQueries({ queryKey: ["admin-addon-items", editId] });
        } catch { toast.error("Failed to save item"); }
    };

    const removeItem = async (id) => {
        if (!window.confirm("Delete this item?")) return;
        const { data } = await api.delete(`/admin/addon-items/${id}`);
        toast.success(data.soft_deleted ? data.message : "Deleted");
        qc.invalidateQueries({ queryKey: ["admin-addon-items", editId] });
    };

    return (
        <div className="space-y-4 pt-2">
            <div className="flex justify-end">
                <Button onClick={openNew} data-testid="add-addon-group-button" className="rounded-full bg-forest hover:bg-forest-dark gap-1.5"><Plus className="w-4 h-4" /> Add Group</Button>
            </div>

            <div className="rounded-2xl bg-white border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="text-muted-foreground border-b border-border bg-secondary/40">
                            <th className="text-start font-medium p-3">Group</th><th className="text-start font-medium">Type</th>
                            <th className="text-start font-medium">Required</th><th className="text-start font-medium">Active</th>
                            <th className="text-end font-medium p-3">Actions</th>
                        </tr></thead>
                        <tbody>
                            {groups.map((g) => (
                                <tr key={g.id} className="border-b border-border/60" data-testid={`addon-group-row-${g.id}`}>
                                    <td className="p-3">{g.name_en}<br /><span className="text-xs text-muted-foreground" dir="rtl">{g.name_ar}</span></td>
                                    <td className="text-muted-foreground">{g.selection_type === "single" ? "Single (radio)" : "Multiple (checkbox)"}</td>
                                    <td>{g.is_required ? "Yes" : "No"}</td>
                                    <td>{g.is_active === false ? "Hidden" : "Active"}</td>
                                    <td className="text-end p-3 whitespace-nowrap">
                                        <button onClick={() => openEdit(g)} className="text-muted-foreground hover:text-forest p-1.5" data-testid={`edit-addon-group-${g.id}`}><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => removeGroup(g.id)} className="text-muted-foreground hover:text-destructive p-1.5" data-testid={`delete-addon-group-${g.id}`}><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {groups.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No add-on groups yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="addon-group-dialog">
                    <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Add-on Group</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <Fld label="Name (EN)"><Input data-testid="addon-group-name-en" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} /></Fld>
                        <Fld label="Name (AR)"><Input data-testid="addon-group-name-ar" dir="rtl" value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></Fld>
                        <Fld label="Selection Type">
                            <Select value={form.selection_type} onValueChange={(v) => set("selection_type", v)}>
                                <SelectTrigger data-testid="addon-group-selection-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="single">Single (radio buttons)</SelectItem>
                                    <SelectItem value="multiple">Multiple (checkboxes)</SelectItem>
                                </SelectContent>
                            </Select>
                        </Fld>
                        <Fld label="Display Order"><Input type="number" value={form.display_order} onChange={(e) => set("display_order", e.target.value)} /></Fld>
                        <label className="flex items-center gap-2 text-sm"><Switch data-testid="addon-group-required" checked={form.is_required} onCheckedChange={(v) => set("is_required", v)} /> Required (customer must pick at least one)</label>
                        <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /> Active</label>
                    </div>
                    <DialogFooter><Button onClick={saveGroup} data-testid="save-addon-group" className="bg-forest hover:bg-forest-dark rounded-full">Save Group</Button></DialogFooter>

                    {editId ? (
                        <div className="mt-4 pt-4 border-t border-border">
                            <h3 className="font-semibold text-sm mb-3">Items</h3>
                            <div className="space-y-2 mb-4">
                                {items.map((it) => (
                                    <div key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm" data-testid={`addon-item-row-${it.id}`}>
                                        <span>{it.name_en} <span className="text-muted-foreground" dir="rtl">({it.name_ar})</span> — {formatKD(it.price)}{it.is_default && <span className="ms-1 text-xs text-forest">· default</span>}{it.is_active === false && <span className="ms-1 text-xs text-muted-foreground">· hidden</span>}</span>
                                        <span className="flex shrink-0">
                                            <button onClick={() => openEditItem(it)} className="text-muted-foreground hover:text-forest p-1"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </span>
                                    </div>
                                ))}
                                {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3 bg-secondary/30 rounded-xl p-3">
                                <Fld label="Item Name (EN)"><Input data-testid="addon-item-name-en" value={itemForm.name_en} onChange={(e) => setI("name_en", e.target.value)} /></Fld>
                                <Fld label="Item Name (AR)"><Input data-testid="addon-item-name-ar" dir="rtl" value={itemForm.name_ar} onChange={(e) => setI("name_ar", e.target.value)} /></Fld>
                                <Fld label="Price (KD)"><Input data-testid="addon-item-price" type="number" step="0.001" value={itemForm.price} onChange={(e) => setI("price", e.target.value)} /></Fld>
                                <Fld label="Display Order"><Input type="number" value={itemForm.display_order} onChange={(e) => setI("display_order", e.target.value)} /></Fld>
                                <label className="flex items-center gap-2 text-sm"><Switch checked={itemForm.is_default} onCheckedChange={(v) => setI("is_default", v)} /> Default selected</label>
                                <label className="flex items-center gap-2 text-sm"><Switch checked={itemForm.is_active} onCheckedChange={(v) => setI("is_active", v)} /> Active</label>
                                <div className="col-span-2 flex justify-end gap-2">
                                    {editItemId && <Button variant="outline" onClick={openNewItem} className="rounded-full">Cancel</Button>}
                                    <Button onClick={saveItem} data-testid="save-addon-item" className="bg-forest hover:bg-forest-dark rounded-full">{editItemId ? "Update Item" : "Add Item"}</Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-2">Save the group first, then add its items here.</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryMappingPanel() {
    const { data: categories = [] } = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await api.get("/admin/categories")).data });
    const { data: groups = [] } = useQuery({ queryKey: ["admin-addon-groups"], queryFn: async () => (await api.get("/admin/addon-groups")).data });

    return (
        <div className="space-y-4 pt-2">
            {categories.map((c) => <CategoryRow key={c.id} category={c} groups={groups} />)}
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
        </div>
    );
}

function CategoryRow({ category, groups }) {
    const qc = useQueryClient();
    const { data } = useQuery({
        queryKey: ["category-addon-groups", category.slug],
        queryFn: async () => (await api.get(`/admin/categories/${category.slug}/addon-groups`)).data,
    });
    const [selectedIds, setSelectedIds] = useState(null);
    const ids = selectedIds ?? data?.group_ids ?? [];

    const toggle = (gid) => setSelectedIds((prev) => {
        const base = prev ?? data?.group_ids ?? [];
        return base.includes(gid) ? base.filter((i) => i !== gid) : [...base, gid];
    });

    const save = async () => {
        try {
            await api.put(`/admin/categories/${category.slug}/addon-groups`, { group_ids: ids });
            toast.success(`Saved for ${category.name_en}`);
            qc.invalidateQueries({ queryKey: ["category-addon-groups", category.slug] });
            setSelectedIds(null);
        } catch { toast.error("Failed to save"); }
    };

    return (
        <div className="rounded-2xl bg-white border border-border p-4" data-testid={`category-addon-row-${category.slug}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">{category.name_en} <span className="text-muted-foreground text-xs" dir="rtl">({category.name_ar})</span></p>
                <Button size="sm" onClick={save} disabled={selectedIds === null} className="rounded-full bg-forest hover:bg-forest-dark">Save</Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                    const active = ids.includes(g.id);
                    return (
                        <button key={g.id} type="button" onClick={() => toggle(g.id)} data-testid={`category-addon-toggle-${category.slug}-${g.id}`}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${active ? "bg-forest text-white border-forest" : "bg-secondary text-muted-foreground border-transparent"}`}>
                            {g.name_en}
                        </button>
                    );
                })}
                {groups.length === 0 && <p className="text-xs text-muted-foreground">Create add-on groups first.</p>}
            </div>
        </div>
    );
}

const Fld = ({ label, children }) => <div><Label className="text-xs mb-1 block text-muted-foreground">{label}</Label>{children}</div>;
