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
    <main className="box-border flex min-h-screen items-center justify-center bg-canvas px-6 py-8 text-ink">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-line bg-panel/90 p-8 shadow-panel">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">
          calc-translation
        </p>
        <h1 className="mb-3 text-3xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Enter your work email to continue.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            required
            type="email"
            value={email}
            onChange={(event: any) => setEmail(String(event.target.value))}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-lime focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
