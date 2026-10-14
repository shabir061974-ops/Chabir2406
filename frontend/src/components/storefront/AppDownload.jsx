import { Capacitor } from "@capacitor/core";
import { useLang } from "@/context/LanguageContext";

export const APP_STORE_URL = "https://apps.apple.com/kw/app/faiha-store/id6816487044";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.faihacoopkw.store";

// The website build is also bundled into the Capacitor iOS/Android apps, where promoting the
// app download makes no sense — render the promotion only in a regular browser.
const showAppPromo = () => !Capacitor.isNativePlatform();

// Official badge artwork (Apple marketing tools / Google Play badge generator). Apple serves the
// same English badge for every Arabic locale; Google Play has a localized Arabic badge. The Play
// PNGs are cropped to the artwork (Google's file ships with transparent padding) so both badges
// line up at the same visible height. Intrinsic sizes are set on the <img> to avoid layout shift.
const APP_STORE_BADGE = { src: "/badges/app-store-en.svg", width: 120, height: 40 };
const GOOGLE_PLAY_BADGE = {
    en: { src: "/badges/google-play-en.png", width: 564, height: 168 },
    ar: { src: "/badges/google-play-ar.png", width: 564, height: 168 },
};

export function StoreBadges({ className = "gap-3", badgeClassName = "h-11" }) {
    const { t, lang } = useLang();
    const play = GOOGLE_PLAY_BADGE[lang] || GOOGLE_PLAY_BADGE.en;
    const link = "inline-block rounded-lg transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2";
    return (
        <div className={`flex flex-wrap items-center ${className}`}>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={link} data-testid="app-store-link">
                <img src={APP_STORE_BADGE.src} width={APP_STORE_BADGE.width} height={APP_STORE_BADGE.height}
                    alt={t("app_store_alt")} className={`${badgeClassName} w-auto block`} loading="lazy" decoding="async" />
            </a>
            <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className={link} data-testid="google-play-link">
                <img src={play.src} width={play.width} height={play.height}
                    alt={t("google_play_alt")} className={`${badgeClassName} w-auto block`} loading="lazy" decoding="async" />
            </a>
        </div>
    );
}

export function AppDownloadSection() {
    const { t } = useLang();
    if (!showAppPromo()) return null;
    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-16" data-testid="app-download-section">
            <div className="rounded-3xl border border-border bg-white px-5 py-8 sm:px-10 sm:py-10 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 text-center lg:text-start">
                <img src="/faiha-logo.png" width={640} height={641} alt="" aria-hidden="true"
                    className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full object-cover bg-white ring-1 ring-border" loading="lazy" decoding="async" />
                <div className="flex-1 min-w-0">
                    <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">{t("app_download_title")}</h2>
                    <p className="mt-2 text-muted-foreground leading-relaxed">{t("app_download_text")}</p>
                </div>
                <StoreBadges className="gap-3 justify-center lg:justify-end shrink-0" />
            </div>
        </section>
    );
}

export function FooterAppDownload() {
    const { t } = useLang();
    if (!showAppPromo()) return null;
    return (
        <div className="mx-auto max-w-7xl px-6 pb-8 -mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-testid="footer-app-download">
            <p className="font-heading font-semibold text-sm">{t("app_download_short")}</p>
            <StoreBadges badgeClassName="h-10" className="gap-2" />
        </div>
    );
}
