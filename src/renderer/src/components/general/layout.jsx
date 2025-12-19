import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./header";
import FontSize from "./font-size";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow w-full max-w-7xl mx-auto flex flex-col">
        <Outlet />
      </main>
      <FontSize />
    </div>
  );
}
