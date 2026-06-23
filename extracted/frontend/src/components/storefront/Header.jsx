import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Globe, Menu, X } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Header = ({ categories = [] }) => {
    const { t, toggleLang, isRtl, ln } = useLang();
    const { count, setOpen } = useCart();
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);

    const submitSearch = (e) => {
        e.preventDefault();
        navigate(`/products?q=${encodeURIComponent(q)}`);
        setMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 glass border-b border-border" data-testid="site-header">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex items-center gap-4 h-16 sm:h-20">
                    <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
                        <img src="/faiha-logo.png" alt={t("brand")} className="w-11 h-11 rounded-full object-cover" />
                        <span className="font-heading font-extrabold text-lg sm:text-xl text-forest leading-none">
                            {t("brand")}
                        </span>
                    </Link>

                    <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                data-testid="search-input"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={t("search_placeholder")}
                                className="ps-9 rounded-full bg-white border-border h-11"
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-1 sm:gap-2 ms-auto">
                        <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="language-toggle"
                            className="rounded-full gap-1.5 font-semibold text-forest">
                            <Globe className="w-4 h-4" />
                            <span className="hidden sm:inline">{t("language")}</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} data-testid="cart-button"
                            className="rounded-full relative text-forest">
                            <ShoppingCart className="w-5 h-5 rtl:-scale-x-100" />
                            {count > 0 && (
                                <span data-testid="cart-count" className="absolute -top-0.5 -end-0.5 grid place-items-center min-w-5 h-5 px-1 text-[11px] font-bold rounded-full bg-terracotta text-white">
                                    {count}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="md:hidden text-forest" onClick={() => setMenuOpen((v) => !v)} data-testid="mobile-menu-toggle">
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* category nav */}
                <nav className="hidden md:flex items-center gap-6 h-11 text-sm font-medium text-muted-foreground overflow-x-auto">
                    <Link to="/products" className="hover:text-forest whitespace-nowrap transition-colors" data-testid="nav-shop">{t("all_products")}</Link>
                    {categories.map((c) => (
                        <Link key={c.id} to={`/category/${c.slug}`} className="hover:text-forest whitespace-nowrap transition-colors" data-testid={`nav-cat-${c.slug}`}>
                            {ln(c)}
                        </Link>
                    ))}
                    <Link to="/track" className="hover:text-forest whitespace-nowrap transition-colors ms-auto" data-testid="nav-track">{t("nav_track")}</Link>
                </nav>
            </div>

            {/* mobile menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-3" data-testid="mobile-menu">
                    <form onSubmit={submitSearch}>
                        <div className="relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="ps-9 rounded-full" />
                        </div>
                    </form>
                    <div className="grid grid-cols-2 gap-2">
                        <Link to="/products" onClick={() => setMenuOpen(false)} className="py-2 text-sm font-medium text-forest">{t("all_products")}</Link>
                        {categories.map((c) => (
                            <Link key={c.id} to={`/category/${c.slug}`} onClick={() => setMenuOpen(false)} className="py-2 text-sm text-muted-foreground">{ln(c)}</Link>
                        ))}
                        <Link to="/track" onClick={() => setMenuOpen(false)} className="py-2 text-sm text-muted-foreground">{t("nav_track")}</Link>
                    </div>
                </div>
            )}
        </header>
    );
};
