import React from "react";
import { useSettings } from "../../context/settings.jsx";

export default function FontSizeSlider() {
  const { fontSize, setFontSize } = useSettings();

  const handleChange = (e) => {
    setFontSize(Number(e.target.value));
  };

  return (
    <div className="flex flex-col gap-2 w-full py-1">
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400 font-medium select-none">
          {fontSize}%
        </span>

        <input
          type="range"
          min="75"
          max="150"
          step="5"
          value={fontSize}
          onChange={handleChange}
          className="
            w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer 
            dark:bg-zinc-700
            accent-blue-600 dark:accent-blue-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
          "
        />
      </div>
    </div>
  );
}
