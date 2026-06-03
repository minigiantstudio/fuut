import { useTranslation, type Lang } from "@/lib/i18n";

const FLAG: Record<Lang, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
};

const LanguageToggle = () => {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center gap-0.5">
      {(["en", "es"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`text-base leading-none px-0.5 transition-all ${
            lang === l
              ? "opacity-100 scale-110"
              : "opacity-35 hover:opacity-70"
          }`}
          aria-label={`Switch to ${l === "en" ? "English" : "Español"}`}
          aria-pressed={lang === l}
        >
          {FLAG[l]}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
