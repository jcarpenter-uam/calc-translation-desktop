import React from "react";
import { useSettings } from "../../context/settings.jsx";
import { FaSearchPlus, FaSearchMinus } from "react-icons/fa";

export default function FontSize() {
  const { fontSize, setFontSize } = useSettings();

  const handleIncrease = () => {
    setFontSize((prev) => Math.min(150, prev + 5));
  };

  const handleDecrease = () => {
    setFontSize((prev) => Math.max(75, prev - 5));
  };

  return (
    <div className="fixed bottom-[24px] right-[24px] z-50 transition-opacity duration-300 ease-in-out opacity-[0.2] hover:opacity-100">
      <div className="flex items-center gap-[4px] bg-white dark:bg-zinc-800 p-[4px] rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700">
        <button
          onClick={handleDecrease}
          disabled={fontSize <= 75}
          className="cursor-pointer p-[6px] hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease font size"
        >
          <FaSearchMinus size={12} />
        </button>

        <span className="text-[11px] font-medium min-w-[32px] text-center text-zinc-500 dark:text-zinc-400 select-none leading-none">
          {fontSize}%
        </span>

        <button
          onClick={handleIncrease}
          disabled={fontSize >= 150}
          className="cursor-pointer p-[6px] hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Increase font size"
        >
          <FaSearchPlus size={12} />
        </button>
      </div>
    </div>
  );
}
