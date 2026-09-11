import { useLang } from "@/context/LanguageContext";
import { useSeo } from "@/hooks/use-seo";

export default function Terms() {
    const { t } = useLang();

    useSeo({
        title: `${t("terms")} | ${t("legal_name")}`,
        description: t("tc_s1_body"),
        path: "/terms",
    });

    const sections = [
        { title: t("tc_s1_title"), body: [t("tc_s1_body")] },
        { title: t("tc_s2_title"), body: [t("tc_s2_body")] },
        { title: t("tc_s3_title"), body: [t("tc_s3_body")] },
        { title: t("tc_s4_title"), body: [t("tc_s4_body")] },
        { title: t("tc_s5_title"), body: [t("tc_s5_body")] },
        { title: t("tc_s6_title"), body: [t("tc_s6_body")] },
        { title: t("tc_s7_title"), body: [t("tc_s7_body1"), t("tc_s7_body2")] },
    ];

    return (
        <div data-testid="terms-page">
            <section className="bg-forest text-white">
                <div className="mx-auto max-w-4xl px-6 py-14 text-center">
                    <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{t("terms")}</h1>
                    <p className="text-white/80 mt-3">{t("legal_name")}</p>
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-6 py-12 space-y-8">
                {sections.map((s) => (
                    <div key={s.title}>
                        <h2 className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-forest">{s.title}</h2>
                        {s.body.map((p, i) => (
                            <p key={i} className="text-muted-foreground leading-relaxed mt-3 text-[15px]">{p}</p>
                        ))}
                    </div>
                ))}
            </section>
        </div>
    );
}
