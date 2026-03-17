import { useAuth } from "../auth/AuthContext";
import { CalendarSection } from "../calendar/CalendarSection";

export function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="mx-auto w-full rounded-2xl p-6 md:p-7">
          <h1 className="mb-2 text-2xl font-semibold">
            Welcome back, {user?.name || user?.email || "Unknown"}!
          </h1>

          <CalendarSection />
        </div>
      </section>
    </main>
  );
}
