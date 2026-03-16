import type { ReactNode } from "react";
import { UserMenu } from "./UserMenu";
import { AppFooter } from "./AppFooter";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-lime/15 blur-3xl" />
      </div>

      <div className="fixed left-4 top-4 z-50 pb-4">
        <UserMenu />
      </div>

      <div className="relative z-10 pt-12">{children}</div>

      <AppFooter />
    </div>
  );
}
