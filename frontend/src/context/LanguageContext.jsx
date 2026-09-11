import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations } from "@/i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem("faiha_lang") || "en");

    useEffect(() => {
        localStorage.setItem("faiha_lang", lang);
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
    }, [lang]);

    const toggleLang = useCallback(() => setLang((l) => (l === "en" ? "ar" : "en")), []);
    const t = useCallback((key) => translations[lang][key] ?? key, [lang]);
    const isRtl = lang === "ar";
    const ln = useCallback((obj) => (lang === "ar" ? obj.name_ar : obj.name_en), [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isRtl, ln }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLang = () => useContext(LanguageContext);
