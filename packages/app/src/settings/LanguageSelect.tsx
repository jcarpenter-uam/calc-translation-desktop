import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SettingHint } from "./SettingHint";
import { useI18n } from "../contexts/UiI18nContext";
import {
  DEFAULT_LANGUAGE_CODE,
  LANGUAGE_OPTIONS,
  getLanguageLabel,
  isLanguageCode,
} from "../languages/LanguageList";

export const LANGUAGE_STORAGE_KEY = "calc-translation-language";

export function readInitialLanguage() {
  const browser = globalThis as any;
  const storedLanguage = browser?.localStorage?.getItem?.(LANGUAGE_STORAGE_KEY);

  return storedLanguage && isLanguageCode(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE_CODE;
}

type LanguageSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  const { locale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<any>(null);
  const listRef = useRef<any>(null);
  const optionRefs = useRef<any[]>([]);
  const listboxId = useId();
  const selectedIndex = useMemo(
    () => Math.max(LANGUAGE_OPTIONS.findIndex((option) => option.value === value), 0),
    [value],
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const browser = globalThis as any;

    const onPointerDown = (event: any) => {
      const target = event?.target;
      if (
        buttonRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    const onKeyDown = (event: any) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    browser.document?.addEventListener("mousedown", onPointerDown);
    browser.document?.addEventListener("keydown", onKeyDown);

    return () => {
      browser.document?.removeEventListener("mousedown", onPointerDown);
      browser.document?.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeOption = optionRefs.current[activeIndex];
    activeOption?.focus();
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const moveActiveIndex = (direction: 1 | -1) => {
    setActiveIndex((current) => {
      const next = current + direction;

      if (next < 0) {
        return LANGUAGE_OPTIONS.length - 1;
      }

      if (next >= LANGUAGE_OPTIONS.length) {
        return 0;
      }

      return next;
    });
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(
        event.key === "ArrowDown"
          ? Math.min(selectedIndex + 1, LANGUAGE_OPTIONS.length - 1)
          : Math.max(selectedIndex - 1, 0),
      );
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((current) => !current);
      setActiveIndex(selectedIndex);
    }
  };

  const onOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(LANGUAGE_OPTIONS.length - 1);
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(LANGUAGE_OPTIONS[activeIndex]!.value);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="mb-2 flex items-center gap-2">
        <label
          htmlFor="language-select"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted"
        >
          {t("transcriptLanguage.title")}
        </label>
        <SettingHint text={t("transcriptLanguage.hint")} />
      </div>
      <div className="relative">
        <button
          ref={buttonRef}
          id="language-select"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onClick={() => {
            setIsOpen((current) => !current);
            setActiveIndex(selectedIndex);
          }}
          onKeyDown={onTriggerKeyDown}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-left text-sm text-ink transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
        >
          <span>{getLanguageLabel(value, locale)}</span>
          <span
            aria-hidden="true"
            className={`ml-3 text-xs text-ink-muted transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            v
          </span>
        </button>

        {isOpen ? (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby="language-select"
            aria-activedescendant={`${listboxId}-${LANGUAGE_OPTIONS[activeIndex]?.value}`}
            className="app-scrollbar absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-panel/95 p-1 shadow-panel backdrop-blur-sm"
          >
            {LANGUAGE_OPTIONS.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  id={`${listboxId}-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option.value)}
                  onKeyDown={onOptionKeyDown}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition focus:outline-none ${
                    isActive
                      ? "bg-lime/15 text-ink"
                      : "text-ink-muted hover:bg-canvas hover:text-ink"
                  } ${isSelected ? "font-semibold text-ink" : "font-medium"}`}
                >
                  <span>{getLanguageLabel(option.value, locale)}</span>
                  {isSelected ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-lime">
                      {t("common.selected")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
