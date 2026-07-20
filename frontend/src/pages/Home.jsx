import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Leaf, Truck, CreditCard } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { useSeo } from "@/hooks/use-seo";
import { ProductCard } from "@/components/storefront/ProductCard";
import { resolveImageUrl } from "@/lib/image";

// Intrinsic size of the source banner (1536x1024, 3:2) — kept on the <img> so the
// browser reserves the right box before the file loads, preventing layout shift.
const HERO_W = 1536;
const HERO_H = 1024;
const HERO_SRCSET = "/hero-cafe-bakery-640.webp 640w, /hero-cafe-bakery-1024.webp 1024w, /hero-cafe-bakery-1536.webp 1536w";
const HERO_SIZES = "(max-width: 1280px) 100vw, 1280px";

export default function Home() {
    const { t, ln, lang } = useLang();
    const { categories = [] } = useOutletContext();

    useSeo({
        title: lang === "ar" ? "متجر الفيحاء | جمعية الفيحاء التعاونية" : "Faiha Store | AL-FAIHA CO-OPERATIVE SOCIETY",
        description: lang === "ar"
            ? "المنصة الرسمية للتسوق الإلكتروني لجمعية الفيحاء التعاونية — بقالة ومخبوزات ومشروبات وقهوة ومنتجات منزلية واحتياجات يومية في جميع أنحاء الكويت."
            : "Official online shopping platform of AL-FAIHA CO-OPERATIVE SOCIETY providing groceries, beverages, bakery products, coffee, household items and daily essentials throughout Kuwait.",
        path: "/",
    });

    const { data: featured } = useQuery({
        queryKey: ["products", "featured"],
        queryFn: async () => (await api.get("/products?featured=true&page_size=8")).data,
    });
    const { data: promo } = useQuery({
        queryKey: ["products", "promo"],
        queryFn: async () => (await api.get("/products?promo=true&page_size=8")).data,
    });

    const features = [
        { icon: Leaf, title: t("feat_fresh"), desc: t("feat_fresh_desc") },
        { icon: Truck, title: t("feat_delivery"), desc: t("feat_delivery_desc") },
        { icon: CreditCard, title: t("feat_pay"), desc: t("feat_pay_desc") },
    ];

    return (
        <div data-testid="home-page">
            {/* Hero */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
                <div className="overflow-hidden rounded-3xl">
                    <img
                        src="/hero-cafe-bakery-1024.webp"
                        srcSet={HERO_SRCSET}
                        sizes={HERO_SIZES}
                        width={HERO_W}
                        height={HERO_H}
                        alt={lang === "ar" ? "مقهى ومخبز الفيحاء — قهوة طازجة ومخبوزات طازجة" : "Faiha Cafe and Bakery — Freshly Brewed Coffee, Freshly Baked Happiness"}
                        className="w-full h-auto block"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        data-testid="hero-banner"
                    />
                </div>
            </section>

            {/* Categories */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-14">
                <div className="flex items-end justify-between mb-6">
                    <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">{t("shop_by_category")}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {categories.map((c, i) => (
                        <Link key={c.id} to={`/category/${c.slug}`} data-testid={`category-tile-${c.slug}`}
                            className="group relative overflow-hidden rounded-2xl aspect-[4/3] border border-border">
                            <img src={resolveImageUrl(c.image)} alt={ln(c)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/85 to-transparent" />
                            <span className="absolute bottom-3 start-4 end-4 text-white font-heading font-semibold text-lg leading-tight">{ln(c)}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Promotions */}
            {promo?.items?.length > 0 && (
                <ProductSection title={t("on_sale")} viewAllHref="/products?promo=true" items={promo.items} t={t} />
            )}

            {/* Features strip */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-16">
                <div className="grid sm:grid-cols-3 gap-4">
                    {features.map((f) => (
                        <div key={f.title} className="flex items-start gap-4 rounded-2xl bg-white border border-border p-6">
                            <span className="grid place-items-center w-12 h-12 rounded-xl bg-forest/10 text-forest shrink-0"><f.icon className="w-6 h-6" /></span>
                            <div>
                                <h3 className="font-heading font-semibold text-lg">{f.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured */}
            {featured?.items?.length > 0 && (
                <ProductSection title={t("featured")} viewAllHref="/products?featured=true" items={featured.items} t={t} />
            )}
        </div>
    );
}

function ProductSection({ title, viewAllHref, items, t }) {
    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-16">
            <div className="flex items-end justify-between mb-6">
                <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">{title}</h2>
                <Link to={viewAllHref} className="text-sm font-semibold text-forest hover:text-terracotta flex items-center gap-1">
                    {t("view_all")} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
        </section>
    );
}
