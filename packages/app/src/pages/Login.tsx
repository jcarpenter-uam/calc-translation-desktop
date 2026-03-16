import { useState } from "react";
import { startLogin } from "../auth/authClient";

export function Login() {
  const [email, setEmail] = useState("");

  const onSubmit = (event: any) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return;
    }

    const returnTo = String((globalThis as any)?.location?.href || "/");
    startLogin(trimmedEmail, returnTo);
  };

  return (
    <main className="box-border flex min-h-[calc(100dvh-3rem)] items-center justify-center px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl">
        <div className="px-6 py-5 text-center sm:px-8 md:px-10">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-accent">
            CALC-Translation
          </h1>
        </div>

        <div className="p-6 sm:p-8 md:p-10">
          <div className="mx-auto flex w-full max-w-xl flex-col justify-center rounded-2xl border border-line/70 bg-panel/80 p-6 md:p-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Account access
            </p>
            <h2 className="mb-2 text-2xl font-semibold">Sign in</h2>
            <p className="mb-6 text-sm text-ink-muted">
              Enter your work email to continue.
            </p>

            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Work email
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event: any) =>
                    setEmail(String(event.target.value))
                  }
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
