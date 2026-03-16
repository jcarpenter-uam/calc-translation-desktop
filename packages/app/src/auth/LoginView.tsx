import { useState } from "react";
import { startLogin } from "./authClient";

export function LoginView() {
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
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
          calc-translation
        </p>
        <h1 className="mb-3 text-3xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-slate-300">
          Enter your work email to continue.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            required
            type="email"
            value={email}
            onChange={(event: any) => setEmail(String(event.target.value))}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
