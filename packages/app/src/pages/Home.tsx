import { useAuth } from "../auth/AuthContext";
import { JoinMeeting } from "../meetings/JoinMeeting";

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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                Welcome Back {user?.name || user?.email}
              </h1>
            </div>
          </div>

          <JoinMeeting onSubmit={handleJoin} />
        </div>
      </section>
    </main>
  );
}
