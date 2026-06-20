import { Link } from "react-router-dom";
import { Leaf, MapPin, Phone, Lock } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export const Footer = () => {
    const { t } = useLang();
    return (
        <footer className="mt-20 bg-forest text-white" data-testid="site-footer">
            <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="grid place-items-center w-9 h-9 rounded-lg bg-white/15"><Leaf className="w-5 h-5" /></span>
                        <span className="font-heading font-extrabold text-lg">{t("brand")}</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{t("tagline")}</p>
                </div>
                <div>
                    <h4 className="font-heading font-semibold mb-3">{t("nav_shop")}</h4>
                    <ul className="space-y-2 text-sm text-white/70">
                        <li><Link to="/products" className="hover:text-white">{t("all_products")}</Link></li>
                        <li><Link to="/products?promo=true" className="hover:text-white">{t("on_sale")}</Link></li>
                        <li><Link to="/track" className="hover:text-white">{t("nav_track")}</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-heading font-semibold mb-3">Contact</h4>
                    <ul className="space-y-2 text-sm text-white/70">
                        <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Faiha, Kuwait</li>
                        <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +965 0000 0000</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-heading font-semibold mb-3">{t("admin_panel")}</h4>
                    <Link to="/admin/login" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white" data-testid="footer-admin-link">
                        <Lock className="w-4 h-4" /> {t("login")}
                    </Link>
                </div>
            </div>
            <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
                © {new Date().getFullYear()} {t("brand")} — Faiha Co-operative Society, Kuwait
            </div>
        </footer>
    );
};
