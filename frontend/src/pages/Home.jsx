import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Truck, CreditCard } from "lucide-react";
import api from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { ProductCard } from "@/components/storefront/ProductCard";
import { resolveImageUrl } from "@/lib/image";
import { Button } from "@/components/ui/button";

const HERO = "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

export default function Home() {
    const { t, ln } = useLang();
    const { categories = [] } = useOutletContext();

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
                <div className="relative overflow-hidden rounded-3xl">
                    <img src={HERO} alt="Fresh groceries" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 via-forest/50 to-forest/20" />
                    <div className="relative px-6 sm:px-12 py-16 sm:py-28 max-w-2xl">
                        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="inline-block px-3 py-1 rounded-full bg-white/15 text-white text-xs uppercase tracking-[0.2em] font-medium">
                            Faiha Co-operative Society
                        </motion.span>
                        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                            className="font-heading font-extrabold text-white text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mt-4">
                            {t("tagline")}
                        </motion.h1>
                        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-8">
                            <Link to="/products">
                                <Button data-testid="hero-cta" className="h-12 px-7 rounded-full bg-terracotta hover:bg-terracotta-dark text-white font-semibold text-base gap-2">
                                    {t("hero_cta")} <ArrowRight className="w-5 h-5 rtl:-scale-x-100" />
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
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
