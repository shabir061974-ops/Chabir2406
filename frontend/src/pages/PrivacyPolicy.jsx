import { useEffect } from "react";
import { useLang } from "@/context/LanguageContext";

export default function PrivacyPolicy() {
    const { t } = useLang();

    useEffect(() => {
        document.title = `${t("privacy_policy")} | ${t("legal_name")}`;
    }, [t]);

    const sections = [
        { title: t("pp_s1_title"), body: [t("pp_s1_body")] },
        {
            title: t("pp_s2_title"),
            body: [t("pp_s2_body")],
            list: [t("pp_s2_li1"), t("pp_s2_li2"), t("pp_s2_li3"), t("pp_s2_li4")],
            after: [t("pp_s2_after")],
        },
        { title: t("pp_s3_title"), body: [t("pp_s3_body")] },
        { title: t("pp_s4_title"), body: [t("pp_s4_body")] },
        { title: t("pp_s5_title"), body: [t("pp_s5_body")] },
        { title: t("pp_s6_title"), body: [t("pp_s6_body")], list: [t("pp_s6_li1"), t("pp_s6_li2")] },
    ];

    return (
        <div data-testid="privacy-page">
            <section className="bg-forest text-white">
                <div className="mx-auto max-w-4xl px-6 py-14 text-center">
                    <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{t("privacy_policy")}</h1>
                    <p className="text-white/80 mt-3">{t("legal_name")}</p>
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-6 py-12 space-y-8">
                {sections.map((s) => (
                    <div key={s.title}>
                        <h2 className="font-heading font-bold text-xl sm:text-2xl tracking-tight text-forest">{s.title}</h2>
                        {s.body?.map((p, i) => (
                            <p key={i} className="text-muted-foreground leading-relaxed mt-3 text-[15px]">{p}</p>
                        ))}
                        {s.list && (
                            <ul className="mt-3 space-y-2 list-disc ps-6 text-[15px] text-muted-foreground">
                                {s.list.map((li) => <li key={li}>{li}</li>)}
                            </ul>
                        )}
                        {s.after?.map((p, i) => (
                            <p key={i} className="text-muted-foreground leading-relaxed mt-3 text-[15px]">{p}</p>
                        ))}
                    </div>
                ))}
            </section>
        </div>
    );
}
