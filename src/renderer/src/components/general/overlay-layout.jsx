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
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl">
      <div className="absolute top-0 left-0 w-full h-12 app-region-drag z-10" />

      {/* Floating Close Button */}
      <button
        onClick={() => window.electron.closeOverlay()}
        className="absolute top-2 right-2 z-50 p-2 bg-black/5 hover:bg-red-500 hover:text-white rounded-full app-region-no-drag transition-colors backdrop-blur-sm"
      >
        <FaTimes size={14} />
      </button>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-4 pt-8">
        <Outlet />
      </div>
    </div>
  );
}
