import { useAuth } from "../auth/AuthContext";
import { JoinMeeting } from "../meetings/JoinMeeting";
import { HostMeeting } from "../meetings/HostMeeting";

export function Home() {
  const { user } = useAuth();

  const handleJoin = ({
    joinUrl,
    meetingId,
    password,
  }: {
    joinUrl: string;
    meetingId: string;
    password: string;
  }) => {
    console.log({ joinUrl, meetingId, meetingPass: password });
  };

  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="p-6 sm:p-8 md:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Dashboard
              </p>
              <h1 className="text-2xl font-semibold">
                Welcome Back {user?.name || user?.email}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                Join an existing session quickly or start configuring a new one.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <section className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6">
              <JoinMeeting onSubmit={handleJoin} />
            </section>

            <section className="rounded-2xl border border-line/70 bg-canvas/70 p-5 sm:p-6">
              <HostMeeting />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
