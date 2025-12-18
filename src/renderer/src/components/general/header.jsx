import React, { useState } from "react";
import { useAuth } from "../../context/auth";
import OsControls from "./os-controls.jsx";
import UserAvatar from "./user.jsx";
import SettingsModal from "../settings/modal";
import { FiSettings } from "react-icons/fi";

export default function Header() {
  const { user, isLoading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-zinc-900/80 app-region-drag">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-2 app-region-no-drag">
              {!isLoading && (
                <>
                  {user ? (
                    <UserAvatar />
                  ) : (
                    <>
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        aria-label="Open Settings"
                        className="
                        p-2 
                        rounded-full 
                        text-zinc-500 
                        hover:bg-zinc-100 
                        dark:text-zinc-400 
                        dark:hover:bg-zinc-800 
                        transition-colors
                        focus:outline-none 
                        focus:ring-2 
                        focus:ring-blue-500 
                        focus:ring-offset-2 
                        dark:focus:ring-offset-zinc-900
                        cursor-pointer
                      "
                      >
                        <FiSettings className="w-5 h-5" />
                      </button>

                      <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                      />
                    </>
                  )}
                </>
              )}
            </div>
            <OsControls />
          </div>
        </div>
      </header>
    </>
  );
}
