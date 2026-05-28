import { useTranslation, type Lang } from "@/lib/i18n";

const LanguageToggle = () => {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center border border-foreground overflow-hidden">
      {(["en", "es"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`text-[6px] px-1.5 py-0.5 font-mono uppercase transition-colors ${
            lang === l
              ? "bg-foreground text-background"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Switch to ${l === "en" ? "English" : "Español"}`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
