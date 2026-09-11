import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Globe, Menu, X, ClipboardList, User } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Pill style for desktop nav links (active = blue background, white text).
const deskLink = ({ isActive }) =>
    `px-4 py-2 rounded-[10px] text-[15px] font-medium tracking-tight whitespace-nowrap transition-all duration-200 ease-out ${
        isActive
            ? "bg-[#0B6CF4] text-white shadow-sm shadow-blue-500/20"
            : "text-slate-600 hover:text-[#0B6CF4] hover:bg-[#0B6CF4]/[0.08]"
    }`;

// Full-width variant for the mobile menu.
const mobLink = ({ isActive }) =>
    `flex items-center px-4 py-3 rounded-[10px] text-[15px] font-medium transition-all duration-200 ${
        isActive
            ? "bg-[#0B6CF4] text-white shadow-sm"
            : "text-slate-700 hover:text-[#0B6CF4] hover:bg-[#0B6CF4]/[0.08]"
    }`;

export const Header = ({ categories = [] }) => {
    const { t, toggleLang, ln } = useLang();
    const { count, setOpen } = useCart();
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [safeAreaTop, setSafeAreaTop] = useState(0);
    const headerRef = useRef(null);

    const submitSearch = (e) => {
        e.preventDefault();
        navigate(`/products?q=${encodeURIComponent(q)}`);
        setMenuOpen(false);
    };

    // Detect safe area inset at runtime for iOS notch/Dynamic Island
    useEffect(() => {
        const detectSafeArea = () => {
            let safeArea = 0;
            // Try visualViewport offset
            if (window.visualViewport) {
                safeArea = Math.max(0, window.visualViewport.offsetTop || 0);
            }
            // Fallback to standard iPhone notch height
            if (safeArea === 0 && window.innerHeight > 800) {
                safeArea = 44;
            }
            setSafeAreaTop(safeArea);
        };

        detectSafeArea();
        window.addEventListener('orientationchange', detectSafeArea);
        return () => window.removeEventListener('orientationchange', detectSafeArea);
    }, []);

    // iOS fix: Attach direct touch/click handlers to bypass event propagation issues
    useEffect(() => {
        const header = headerRef.current;
        if (!header) return;

        const handleLogoClick = () => navigate("/");
        const handleAccountClick = () => navigate("/account");
        const handleCartClick = () => setOpen(true);
        const handleMenuClick = () => setMenuOpen((v) => !v);

        const logoLink = header.querySelector('[data-testid="logo-link"]');
        const accountLink = header.querySelector('[data-testid="account-link"]');
        const cartButton = header.querySelector('[data-testid="cart-button"]');
        const menuButton = header.querySelector('[data-testid="mobile-menu-toggle"]');

        // Add both click and touchend listeners for redundancy
        if (logoLink) {
            logoLink.addEventListener("click", handleLogoClick, true);
            logoLink.addEventListener("touchend", handleLogoClick, true);
        }
        if (accountLink) {
            accountLink.addEventListener("click", handleAccountClick, true);
            accountLink.addEventListener("touchend", handleAccountClick, true);
        }
        if (cartButton) {
            cartButton.addEventListener("click", handleCartClick, true);
            cartButton.addEventListener("touchend", handleCartClick, true);
        }
        if (menuButton) {
            menuButton.addEventListener("click", handleMenuClick, true);
            menuButton.addEventListener("touchend", handleMenuClick, true);
        }

        return () => {
            if (logoLink) {
                logoLink.removeEventListener("click", handleLogoClick, true);
                logoLink.removeEventListener("touchend", handleLogoClick, true);
            }
            if (accountLink) {
                accountLink.removeEventListener("click", handleAccountClick, true);
                accountLink.removeEventListener("touchend", handleAccountClick, true);
            }
            if (cartButton) {
                cartButton.removeEventListener("click", handleCartClick, true);
                cartButton.removeEventListener("touchend", handleCartClick, true);
            }
            if (menuButton) {
                menuButton.removeEventListener("click", handleMenuClick, true);
                menuButton.removeEventListener("touchend", handleMenuClick, true);
            }
        };
    }, [navigate, setOpen]);

    return (
        <header ref={headerRef} className="fixed left-0 right-0 z-50 glass border-b border-border" style={{ top: `${safeAreaTop}px`, pointerEvents: 'auto', touchAction: 'auto' }} data-testid="site-header">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-11">
                {/* top bar: logo · search · actions */}
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
                        <Link to="/account" data-testid="account-link" aria-label={t("my_account")}
                            className="grid place-items-center w-9 h-9 rounded-full text-forest hover:bg-forest/[0.08] transition-colors">
                            <User className="w-5 h-5" />
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} data-testid="cart-button"
                            className="rounded-full relative text-forest">
                            <ShoppingCart className="w-5 h-5 rtl:-scale-x-100" />
                            {count > 0 && (
                                <span data-testid="cart-count" className="absolute -top-0.5 -end-0.5 grid place-items-center min-w-5 h-5 px-1 text-[11px] font-bold rounded-full bg-terracotta text-white">
                                    {count}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="md:hidden text-forest" onClick={() => setMenuOpen((v) => !v)} data-testid="mobile-menu-toggle" aria-label="Menu">
                            <span className="relative block w-5 h-5">
                                <Menu className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${menuOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
                                <X className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${menuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
                            </span>
                        </Button>
                    </div>
                </div>

                {/* desktop category nav (dynamic: renders whatever active categories the API returns) */}
                <nav className="hidden md:flex items-center gap-2 h-14 scrollbar-hide" data-testid="primary-nav">
                    <NavLink to="/products" end className={deskLink} data-testid="nav-shop">{t("all_products")}</NavLink>
                    {categories.map((c) => (
                        <NavLink key={c.id} to={`/category/${c.slug}`} end className={deskLink} data-testid={`nav-cat-${c.slug}`}>
                            {ln(c)}
                        </NavLink>
                    ))}
                    <NavLink to="/track" end className={({ isActive }) => `${deskLink({ isActive })} ms-auto`} data-testid="nav-track">
                        {t("nav_track")}
                    </NavLink>
                </nav>
            </div>

            {/* mobile menu (smooth slide-down) */}
            <div
                className={`md:hidden overflow-hidden border-t border-border bg-white/95 backdrop-blur transition-all duration-300 ease-in-out ${
                    menuOpen ? "max-h-[80vh] opacity-100 pointer-events-auto" : "max-h-0 opacity-0 pointer-events-none"
                }`}
                data-testid="mobile-menu"
            >
                <div className="px-4 py-4 space-y-3">
                    <form onSubmit={submitSearch}>
                        <div className="relative">
                            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} className="ps-9 rounded-full" />
                        </div>
                    </form>
                    <div className="flex flex-col gap-1">
                        <NavLink to="/products" end onClick={() => setMenuOpen(false)} className={mobLink}>{t("all_products")}</NavLink>
                        {categories.map((c) => (
                            <NavLink key={c.id} to={`/category/${c.slug}`} end onClick={() => setMenuOpen(false)} className={mobLink}>
                                {ln(c)}
                            </NavLink>
                        ))}
                        <NavLink to="/account" end onClick={() => setMenuOpen(false)} className={mobLink}>
                            <User className="w-4 h-4 me-2" />{t("my_account")}
                        </NavLink>
                        <NavLink to="/track" end onClick={() => setMenuOpen(false)} className={mobLink}>
                            <ClipboardList className="w-4 h-4 me-2" />{t("nav_track")}
                        </NavLink>
                    </div>
                </div>
            </div>
        </header>
    );
};
