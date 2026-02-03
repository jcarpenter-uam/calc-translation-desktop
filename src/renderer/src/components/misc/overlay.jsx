import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useLocation } from "react-router-dom";

export default function Overlay() {
  const location = useLocation();

  const handletoggle = () => {
    const currentPath = location.pathname;
    const overlayPath =
      currentPath.replace("/sessions/", "/overlay/session/") + location.search;
    window.electron.openOverlay(overlayPath);
  };

  return (
    <div className="fixed bottom-[24px] right-[130px] z-50 transition-opacity duration-300 ease-in-out opacity-[0.2] hover:opacity-100">
      <div className="flex items-center gap-[4px] bg-white dark:bg-zinc-800 p-[4px] rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700">
        <button
          onClick={handletoggle}
          className="cursor-pointer p-[6px] hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Open Overlay"
        >
          <FaExternalLinkAlt size={12} />
        </button>
      </div>
    </div>
  );
}
