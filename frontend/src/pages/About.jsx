import { Link } from "react-router-dom";
import { Building2, Target, ShoppingBasket, Globe, Phone, Mail, Clock, ArrowRight } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";

// Non-translatable contact constants (URLs / numbers).
const SITE = "https://www.faihacoopkw.com";
const PHONE = "+965 1861000";
const EMAIL = "info@faihacoopkw.com";

const OFFERING_KEYS = [
    "offer_groceries",
    "offer_bakery",
    "offer_beverages",
    "offer_coffee",
    "offer_household",
    "offer_fresh",
    "offer_essentials",
];

export default function About() {
    const { t } = useLang();

    useSeo({
        title: `${t("about_title")} | ${t("legal_name")}`,
        description: t("about_intro"),
        path: "/about",
    });

    return (
        <div data-testid="about-page">
            {/* Header banner */}
            <section className="bg-forest text-white">
                <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20 text-center">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs uppercase tracking-[0.2em] font-medium">
                        {t("about_badge")}
                    </span>
                    <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-4">
                        {t("about_title")}
                    </h1>
                    <p className="text-white/80 leading-relaxed mt-5 max-w-2xl mx-auto">
                        {t("about_intro")}
                    </p>
                </div>
            </section>

            {/* Body */}
            <section className="mx-auto max-w-5xl px-6 py-14">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
                        <span className="grid place-items-center w-12 h-12 rounded-xl bg-forest/10 text-forest">
                            <Building2 className="w-6 h-6" />
                        </span>
                        <h2 className="font-heading font-bold text-xl mt-4">{t("about_who_title")}</h2>
                        <p className="text-muted-foreground leading-relaxed mt-2 text-[15px]">{t("about_who_body")}</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
                        <span className="grid place-items-center w-12 h-12 rounded-xl bg-forest/10 text-forest">
                            <Target className="w-6 h-6" />
                        </span>
                        <h2 className="font-heading font-bold text-xl mt-4">{t("about_mission_title")}</h2>
                        <p className="text-muted-foreground leading-relaxed mt-2 text-[15px]">{t("about_mission_body")}</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-border p-6 shadow-sm">
                        <span className="grid place-items-center w-12 h-12 rounded-xl bg-forest/10 text-forest">
                            <ShoppingBasket className="w-6 h-6" />
                        </span>
                        <h2 className="font-heading font-bold text-xl mt-4">{t("about_offer_title")}</h2>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {OFFERING_KEYS.map((key) => (
                                <li key={key} className="px-3 py-1 rounded-full bg-cream border border-border text-sm text-forest">
                                    {t(key)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Legal entity highlight */}
                <div className="mt-10 rounded-2xl bg-forest text-white p-8 text-center">
                    <p className="text-white/70 text-sm uppercase tracking-[0.2em]">{t("about_legal_label")}</p>
                    <p className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight mt-2">
                        {t("legal_name")}
                    </p>
                    <p className="text-white/70 mt-2">{t("about_owned_by")}</p>
                </div>

                {/* Official contact details */}
                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-border p-4">
                        <Globe className="w-5 h-5 text-forest shrink-0" />
                        <a href={SITE} className="text-[15px] hover:underline break-all">{SITE}</a>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-border p-4">
                        <Phone className="w-5 h-5 text-forest shrink-0" />
                        <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="text-[15px] hover:underline" dir="ltr">{PHONE}</a>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-border p-4">
                        <Mail className="w-5 h-5 text-forest shrink-0" />
                        <a href={`mailto:${EMAIL}`} className="text-[15px] hover:underline break-all" dir="ltr">{EMAIL}</a>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-border p-4">
                        <Clock className="w-5 h-5 text-forest shrink-0" />
                        <span className="text-[15px]">{t("hours_24")}</span>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <Link to="/contact">
                        <Button className="h-12 px-7 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold gap-2">
                            {t("nav_contact")} <ArrowRight className="w-5 h-5 rtl:-scale-x-100" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
