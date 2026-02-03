import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import { Outlet } from "react-router-dom";

export default function OverlayLayout() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl">
      {/* Draggable Header */}
      <div className="h-8 flex items-center justify-between px-2 bg-zinc-100/50 dark:bg-zinc-800/50 app-region-drag cursor-move">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-2">
          Session Overlay
        </span>
        {/* Close Button */}
        <button
          onClick={() => window.electron.closeOverlay()}
          className="p-1 hover:bg-red-500 hover:text-white rounded-md app-region-no-drag transition-colors"
        >
          <FaTimes size={14} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-2">
        <Outlet />
      </div>
    </div>
  );
}
