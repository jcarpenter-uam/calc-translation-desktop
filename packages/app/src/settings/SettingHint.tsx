import { useState, useRef } from "react";
import { useI18n } from "../contexts/UiI18nContext";

type SettingHintProps = {
  text: string;
};

export function SettingHint({ text }: SettingHintProps) {
  const { t } = useI18n();
  const tooltipRef = useRef<any>(null);
  const [alignment, setAlignment] = useState<"center" | "left" | "right">(
    "center",
  );

  const updateAlignment = () => {
    const browser = globalThis as any;
    const viewportWidth = browser?.innerWidth;
    const rect = tooltipRef.current?.getBoundingClientRect?.();

    if (!viewportWidth || !rect) {
      return;
    }

    const edgePadding = 12;

    if (rect.left < edgePadding) {
      setAlignment("left");
      return;
    }

    if (rect.right > viewportWidth - edgePadding) {
      setAlignment("right");
      return;
    }

    setAlignment("center");
  };

  return (
    <span
      className="group relative inline-flex align-middle"
      onMouseEnter={updateAlignment}
      onFocus={updateAlignment}
    >
      <button
        type="button"
        aria-label={t("settings.title")}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-line text-[10px] font-semibold leading-none text-ink-muted transition group-hover:border-lime group-hover:text-lime"
      >
        ?
      </button>
      <span
        ref={tooltipRef}
        className={`pointer-events-none absolute top-full z-20 mt-2 w-52 rounded-lg border border-line bg-panel px-2 py-1.5 text-[11px] font-normal normal-case leading-snug text-ink opacity-0 shadow-panel transition group-hover:opacity-100 group-focus-within:opacity-100 ${
          alignment === "left"
            ? "left-0"
            : alignment === "right"
              ? "right-0"
              : "left-1/2 -translate-x-1/2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
