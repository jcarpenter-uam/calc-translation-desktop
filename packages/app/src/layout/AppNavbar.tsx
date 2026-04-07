import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/UiI18nContext";
import { useAppRoute } from "../contexts/RouteContext";

type NavItem = {
  label: string;
  route: "home" | "calendar" | "admin";
};

/**
 * Top-level navigation for authenticated app pages.
 */
export function AppNavbar() {
  const { status, user } = useAuth();
  const { route, navigateTo } = useAppRoute();
  const { t } = useI18n();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const containerRef = useRef<any>(null);

  const isAdmin =
    user?.role === "tenant_admin" || user?.role === "super_admin";

  const items: NavItem[] = [
    { label: t("nav.dashboard"), route: "home" },
    { label: t("nav.calendar"), route: "calendar" },
    ...(isAdmin ? [{ label: t("nav.admin"), route: "admin" } as const] : []),
  ];

  const activeLabel = useMemo(() => {
    return items.find((item) => item.route === route)?.label || t("nav.pages");
  }, [items, route, t]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [route]);

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      document?: {
        addEventListener?: (name: string, handler: (event: Event) => void) => void;
        removeEventListener?: (name: string, handler: (event: Event) => void) => void;
      };
    };

    const onPointerDown = (event: Event) => {
      const target = (event as any)?.target;
      if (
        containerRef.current &&
        target &&
        !containerRef.current?.contains?.(target)
      ) {
        setIsMobileOpen(false);
      }
    };

    browser.document?.addEventListener?.("mousedown", onPointerDown);
    return () => {
      browser.document?.removeEventListener?.("mousedown", onPointerDown);
    };
  }, []);

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <nav
        className="hidden items-center gap-2 rounded-full border border-line bg-panel/90 px-2 py-2 shadow-panel backdrop-blur-sm sm:flex"
        aria-label={t("nav.primary")}
      >
        {items.map((item) => {
          const isActive = route === item.route;

          return (
            <button
              key={item.route}
              id={item.route === "calendar" ? "tour-nav-calendar" : undefined}
              type="button"
              onClick={() => navigateTo(item.route)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                isActive
                  ? "border-lime/50 bg-lime/10 text-lime"
                  : "border-line text-ink hover:border-lime hover:text-lime"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen((value) => !value)}
          className="rounded-full border border-line bg-panel/90 px-3 py-2 text-xs font-semibold text-ink shadow-panel backdrop-blur-sm transition hover:border-lime hover:text-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
          aria-haspopup="menu"
          aria-expanded={isMobileOpen}
          aria-label={t("nav.openPageNavigation")}
        >
          {activeLabel}
        </button>

        {isMobileOpen ? (
          <div
            className="absolute left-0 top-12 w-40 rounded-xl border border-line bg-panel/95 p-2 shadow-panel backdrop-blur-sm"
            role="menu"
            aria-label={t("nav.pageNavigation")}
          >
            {items.map((item) => {
              const isActive = route === item.route;

              return (
                <button
                  key={item.route}
                  id={item.route === "calendar" ? "tour-nav-calendar-mobile" : undefined}
                  type="button"
                  onClick={() => navigateTo(item.route)}
                  className={`mb-1 w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold transition last:mb-0 focus:outline-none focus:ring-4 focus:ring-lime/20 ${
                    isActive
                      ? "border-lime/50 bg-lime/10 text-lime"
                      : "border-line bg-canvas text-ink hover:border-lime hover:text-lime"
                  }`}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
