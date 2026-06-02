import { createContext, useContext, useState, type ReactNode } from "react";
import en from "./en.json";
import es from "./es.json";

export type Lang = "en" | "es";
export type TranslationKey = keyof typeof en;

// Ensure es.json has the same keys as en.json at compile time
type EnsureComplete = Record<TranslationKey, string>;
const _: EnsureComplete = es; void _;

const strings: Record<Lang, Record<TranslationKey, string>> = { en, es };

function detectLang(): Lang {
  const cached = localStorage.getItem("fuut:lang");
  if (cached === "en" || cached === "es") return cached;
  const detected: Lang = navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  localStorage.setItem("fuut:lang", detected);
  return detected;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = (l: Lang) => {
    localStorage.setItem("fuut:lang", l);
    setLangState(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const { lang, setLang } = useContext(LanguageContext);
  const t = (key: TranslationKey, variables?: Record<string, string | number>): string => {
    let str = strings[lang][key];
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        str = str.replace(`{{${k}}}`, String(v));
      });
    }
    return str;
  };
  return { t, lang, setLang };
}
