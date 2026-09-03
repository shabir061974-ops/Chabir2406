import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { formatKD } from "@/lib/format";

/**
 * Renders the "Customize Your Order" groups (radio for selection_type="single",
 * checkboxes for "multiple") and reports the flat selected-items list + whether every
 * required group has a pick, so the caller can gate Add to Cart and show a live total.
 * Purely presentational/controlled -- no fetching here.
 */
export function ProductAddons({ groups, onChange }) {
    const { t, ln } = useLang();
    // { [groupId]: itemId[] }
    const [selected, setSelected] = useState(() => {
        const init = {};
        for (const g of groups) {
            const defaults = g.items.filter((i) => i.is_default).map((i) => i.id);
            if (defaults.length > 0) init[g.id] = g.selection_type === "single" ? [defaults[0]] : defaults;
        }
        return init;
    });

    const valid = useMemo(
        () => groups.every((g) => !g.is_required || (selected[g.id] || []).length > 0),
        [groups, selected]
    );

    const flatItems = useMemo(() => {
        const out = [];
        for (const g of groups) {
            for (const iid of selected[g.id] || []) {
                const item = g.items.find((i) => i.id === iid);
                if (item) out.push({ group_id: g.id, item_id: item.id, name_en: item.name_en, name_ar: item.name_ar, price: item.price });
            }
        }
        return out;
    }, [groups, selected]);

    useEffect(() => {
        onChange?.({ items: flatItems, valid });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flatItems, valid]);

    const pickSingle = (groupId, itemId) => setSelected((s) => ({ ...s, [groupId]: [itemId] }));
    const toggleMultiple = (groupId, itemId) => setSelected((s) => {
        const current = s[groupId] || [];
        const next = current.includes(itemId) ? current.filter((i) => i !== itemId) : [...current, itemId];
        return { ...s, [groupId]: next };
    });

    return (
        <div className="mt-8 space-y-6" data-testid="product-addons">
            <h2 className="font-heading font-semibold text-lg">{t("customize_order")}</h2>
            {groups.map((g) => (
                <div key={g.id} data-testid={`addon-group-${g.id}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                        <h3 className="font-semibold text-sm">{ln(g)}</h3>
                        {g.is_required && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-terracotta/10 text-terracotta font-medium">{t("required")}</span>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {g.items.map((item) => {
                            const isSelected = (selected[g.id] || []).includes(item.id);
                            const onClick = () => g.selection_type === "single" ? pickSingle(g.id, item.id) : toggleMultiple(g.id, item.id);
                            return (
                                <button key={item.id} type="button" onClick={onClick}
                                    data-testid={`addon-item-${item.id}`}
                                    className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-start text-sm transition-colors ${
                                        isSelected ? "border-forest bg-forest/5" : "border-border hover:border-forest/40"
                                    }`}>
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span className={`grid place-items-center w-4 h-4 shrink-0 border-2 ${g.selection_type === "single" ? "rounded-full" : "rounded"} ${isSelected ? "border-forest bg-forest" : "border-muted-foreground/40"}`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                        </span>
                                        <span className="truncate">{ln(item)}</span>
                                    </span>
                                    {item.price > 0 && <span className="shrink-0 text-xs text-muted-foreground">+{formatKD(item.price)}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
