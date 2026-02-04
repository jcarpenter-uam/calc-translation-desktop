import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./header";
import FontSize from "./font-size";
import Overlay from "../misc/overlay";

export default function Layout() {
  const location = useLocation();

  const isSessionPage = location.pathname.startsWith("/sessions/");

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />

      <main className="flex-grow w-full mx-auto flex flex-col">
        <Outlet />
      </main>
      <FontSize />
      {isSessionPage && <Overlay />}
    </div>
  );
}
