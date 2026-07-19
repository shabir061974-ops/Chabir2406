import { useState } from "react";
import { Building2, Globe, Phone, Mail, Clock, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Non-translatable contact constants (URLs / numbers).
const SITE = "https://www.faihacoopkw.com";
const PHONE = "+965 1861000";
const EMAIL = "info@faihacoopkw.com";

export default function Contact() {
    const { t } = useLang();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    useSeo({
        title: `${t("nav_contact")} | ${t("legal_name")}`,
        description: t("contact_intro"),
        path: "/contact",
    });

    const onSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) {
            toast.error(t("contact_validation"));
            return;
        }
        // No backend contact endpoint — compose the message in the visitor's mail app.
        const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
        window.location.href =
            `mailto:${EMAIL}?subject=${encodeURIComponent(subject || t("contact_default_subject"))}` +
            `&body=${encodeURIComponent(body)}`;
        toast.success(t("contact_opening"));
    };

    const info = [
        { icon: Building2, label: t("label_organization"), value: t("legal_name") },
        { icon: Globe, label: t("label_website"), value: SITE, href: SITE, ltr: true },
        { icon: Phone, label: t("label_phone"), value: PHONE, href: `tel:${PHONE.replace(/\s/g, "")}`, ltr: true },
        { icon: Mail, label: t("label_email"), value: EMAIL, href: `mailto:${EMAIL}`, ltr: true },
        { icon: Clock, label: t("label_hours"), value: t("hours_24") },
    ];

    return (
        <div data-testid="contact-page">
            {/* Header banner */}
            <section className="bg-forest text-white">
                <div className="mx-auto max-w-4xl px-6 py-16 text-center">
                    <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">{t("nav_contact")}</h1>
                    <p className="text-white/80 leading-relaxed mt-4 max-w-2xl mx-auto">{t("contact_intro")}</p>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-14 grid gap-10 lg:grid-cols-2">
                {/* Contact details */}
                <div>
                    <h2 className="font-heading font-bold text-2xl tracking-tight">{t("contact_getintouch")}</h2>
                    <ul className="mt-6 space-y-3">
                        {info.map(({ icon: Icon, label, value, href, ltr }) => (
                            <li key={label} className="flex items-start gap-3 rounded-xl bg-white border border-border p-4">
                                <span className="grid place-items-center w-10 h-10 rounded-lg bg-forest/10 text-forest shrink-0">
                                    <Icon className="w-5 h-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                                    {href ? (
                                        <a href={href} className="font-medium hover:underline break-all" dir={ltr ? "ltr" : undefined}>{value}</a>
                                    ) : (
                                        <p className="font-medium break-words">{value}</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact form */}
                <div>
                    <h2 className="font-heading font-bold text-2xl tracking-tight">{t("contact_sendmsg")}</h2>
                    <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="contact-form">
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-name">{t("form_name")}</Label>
                            <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("form_name_ph")} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-email">{t("label_email")}</Label>
                            <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" dir="ltr" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-subject">{t("form_subject")}</Label>
                            <Input id="cf-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("form_subject_ph")} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cf-message">{t("form_message")}</Label>
                            <Textarea id="cf-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("form_message_ph")} rows={5} />
                        </div>
                        <Button type="submit" className="h-12 px-7 rounded-full bg-forest hover:bg-forest-dark text-white font-semibold gap-2" data-testid="contact-submit">
                            <Send className="w-5 h-5 rtl:-scale-x-100" /> {t("contact_send_btn")}
                        </Button>
                    </form>
                </div>
            </section>

            {/* Location map */}
            <section className="mx-auto max-w-6xl px-6 pb-16">
                <h2 className="font-heading font-bold text-2xl tracking-tight flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-forest" /> {t("contact_location")}
                </h2>
                <p className="text-muted-foreground mt-2">{t("contact_location_sub")}</p>
                <div className="mt-4 rounded-2xl overflow-hidden border border-border bg-white">
                    <iframe
                        title={t("legal_name")}
                        src="https://www.google.com/maps?q=Al-Faiha,+Kuwait&output=embed"
                        className="w-full h-80"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            </section>
        </div>
    );
}
