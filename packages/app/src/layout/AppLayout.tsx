import type { ReactNode } from "react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { AppFooter } from "./AppFooter";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <div className="fixed left-4 top-4 z-50">
        <ThemeToggle />
      </div>

      {children}

      <AppFooter />
    </>
  );
}
