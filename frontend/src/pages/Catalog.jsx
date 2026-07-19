import { useMemo } from "react";
import { useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useSeo } from "@/hooks/use-seo";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Catalog() {
    const { slug } = useParams();
    const [params, setParams] = useSearchParams();
    const { t, ln } = useLang();
    const { categories = [] } = useOutletContext();

    const q = params.get("q") || "";
    const promo = params.get("promo");
    const featured = params.get("featured");
    const sort = params.get("sort") || "featured";

    const queryString = useMemo(() => {
        const sp = new URLSearchParams();
        if (slug) sp.set("category", slug);
        if (q) sp.set("q", q);
        if (promo) sp.set("promo", "true");
        if (featured) sp.set("featured", "true");
        sp.set("sort", sort);
        sp.set("page_size", "60");
        return sp.toString();
    }, [slug, q, promo, featured, sort]);

    const { data, isLoading } = useQuery({
        queryKey: ["catalog", queryString],
        queryFn: async () => (await api.get(`/products?${queryString}`)).data,
    });

    const cat = categories.find((c) => c.slug === slug);
    const title = cat ? ln(cat) : promo ? t("on_sale") : featured ? t("featured") : q ? q : t("all_products");

    useSeo({
        title: `${title} | Faiha Store`,
        description: cat
            ? `${title} — shop ${title} online at Faiha Store, the official platform of AL-FAIHA CO-OPERATIVE SOCIETY. Fast delivery across Kuwait.`
            : `${t("all_products")} — browse the full Faiha Store catalog: groceries, bakery, beverages, coffee and daily essentials. Official platform of AL-FAIHA CO-OPERATIVE SOCIETY.`,
        path: slug ? `/category/${slug}` : "/products",
    });

    const setSort = (v) => {
        const sp = new URLSearchParams(params);
        sp.set("sort", v);
        setParams(sp);
    };

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8" data-testid="catalog-page">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-heading font-bold text-3xl tracking-tight">{title}</h1>
                    {data && <p className="text-sm text-muted-foreground mt-1">{data.total} {t("items")}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger className="w-44 rounded-full bg-white" data-testid="sort-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="featured">{t("sort_featured")}</SelectItem>
                            <SelectItem value="price_asc">{t("sort_price_asc")}</SelectItem>
                            <SelectItem value="price_desc">{t("sort_price_desc")}</SelectItem>
                            <SelectItem value="name">{t("sort_name")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
                </div>
            ) : data?.items?.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {data.items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                </div>
            ) : (
                <div className="py-24 text-center text-muted-foreground" data-testid="no-products">{t("no_products")}</div>
            )}
        </div>
    );
}
