import { Link } from "react-router-dom";
import { MapPin, Phone, Lock, Mail, Clock } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export const Footer = () => {
    const { t } = useLang();
    return (
        <footer className="mt-20 bg-forest text-white" data-testid="site-footer">
            <div className="mx-auto max-w-7xl px-6 py-14 grid gap-10 md:grid-cols-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <img src="/faiha-logo.png" alt={t("brand")} className="w-10 h-10 rounded-full object-cover bg-white" />
                        <span className="font-heading font-extrabold text-lg">{t("brand")}</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{t("tagline")}</p>
                    <p className="text-xs text-white/60 leading-relaxed">Official Online Store of<br />AL-FAIHA CO-OPERATIVE SOCIETY</p>
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
                        <li className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> Faiha, Kuwait</li>
                        <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> +965 1861000</li>
                        <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> <a href="mailto:info@faihacoopkw.com" className="hover:text-white break-all">info@faihacoopkw.com</a></li>
                        <li className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0" /> {t("hours_24")}</li>
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
                © {new Date().getFullYear()} AL-FAIHA CO-OPERATIVE SOCIETY. All Rights Reserved.
            </div>
        </footer>
    );
};
