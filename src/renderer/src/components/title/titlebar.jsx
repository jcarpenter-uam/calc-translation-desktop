import React from "react";
import OsControls from "./os-controls.jsx";

export default function Titlebar({ children }) {
  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-zinc-900/80 app-region-drag">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-2 app-region-no-drag">
              {children}
            </div>
            <OsControls />
          </div>
        </div>
      </header>
    </>
  );
}
