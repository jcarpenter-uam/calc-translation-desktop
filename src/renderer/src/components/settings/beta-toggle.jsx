import React from "react";
import { useSettings } from "../../context/settings.jsx";

/**
 * This is a small, subtle toggle switch for beta updates.
 */
export default function BetaToggle() {
  const { isBetaEnabled, setBetaChannel } = useSettings();

  const handleBetaToggleChange = (event) => {
    setBetaChannel(event.target.checked);
  };

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={isBetaEnabled}
        onChange={handleBetaToggleChange}
      />
      <div className="w-9 h-5 bg-zinc-200 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-zinc-500 dark:peer-checked:bg-zinc-600"></div>
    </label>
  );
}
