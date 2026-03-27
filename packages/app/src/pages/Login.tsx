import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaWindows } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  chooseLoginProvider,
  startLogin,
  type LoginChoiceOption,
} from "../hooks/auth";
import { useNotifications } from "../notifications/NotificationContext";

export function Login() {
  const { notify } = useNotifications();
  const [email, setEmail] = useState("");
  const [providerOptions, setProviderOptions] = useState<LoginChoiceOption[]>([]);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: any) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return;
    }

    const returnTo = String((globalThis as any)?.location?.href || "/");
    setIsSubmitting(true);

    try {
      const result = await startLogin(trimmedEmail, returnTo);
      if (result.mode === "select_provider") {
        setSubmittedEmail(result.email);
        setProviderOptions(result.options);
      }
    } catch (err: any) {
      notify({
        title: "Login Failed",
        message: err?.message || "Failed to start login.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnTo = String((globalThis as any)?.location?.href || "/");
  const browser = globalThis as typeof globalThis & {
    document?: {
      body?: Element | DocumentFragment;
    };
  };
  const portalTarget = browser.document?.body;

  useEffect(() => {
    if (providerOptions.length === 0) {
      return;
    }

    const eventBrowser = globalThis as typeof globalThis & {
      addEventListener?: (
        type: string,
        listener: (event: { key?: string }) => void,
      ) => void;
      removeEventListener?: (
        type: string,
        listener: (event: { key?: string }) => void,
      ) => void;
    };

    const handleKeyDown = (event: { key?: string }) => {
      if (event.key === "Escape") {
        setProviderOptions([]);
        setSubmittedEmail("");
      }
    };

    eventBrowser.addEventListener?.("keydown", handleKeyDown);

    return () => {
      eventBrowser.removeEventListener?.("keydown", handleKeyDown);
    };
  }, [providerOptions.length]);

  const providerChooser = providerOptions.length > 0 ? (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 px-4 backdrop-blur-sm"
      onClick={() => {
        setProviderOptions([]);
        setSubmittedEmail("");
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-line/80 bg-panel/95 p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Choose Sign-In Method
          </p>
          <h3 className="text-2xl font-semibold text-ink">Select a provider</h3>
          <p className="text-sm text-ink-muted">
            `{submittedEmail}` can sign in with more than one provider for this domain.
          </p>
          <p className="text-sm text-ink-muted">
            Your organization supports multiple identity providers for this email domain. Choose the account system you normally use to continue.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {providerOptions.map((option) => (
            <button
              key={`${option.tenantId}-${option.providerType}`}
              type="button"
              onClick={() => {
                void chooseLoginProvider(
                  submittedEmail,
                  option.tenantId,
                  option.providerType,
                  returnTo,
                );
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-sm text-ink transition hover:border-lime hover:text-lime"
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${option.providerType === "entra" ? "border-sky-400/40 bg-sky-500/10 text-sky-200" : "border-amber-400/40 bg-amber-500/10 text-amber-200"}`}
                  aria-hidden="true"
                >
                  {option.providerType === "entra" ? (
                    <FaWindows className="h-4 w-4" />
                  ) : (
                    <FcGoogle className="h-5 w-5" />
                  )}
                </span>
                <span>
                  <span className="block font-semibold text-ink">
                    {option.providerType === "entra" ? "Microsoft Entra" : "Google"}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {option.tenantName || option.tenantId}
                  </span>
                </span>
              </span>
              <span className="text-xs uppercase tracking-[0.12em] text-ink-muted">
                Continue
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setProviderOptions([]);
              setSubmittedEmail("");
            }}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:border-lime hover:text-lime"
          >
            Use Different Email
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
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
                  onChange={(event: any) => setEmail(String(event.target.value))}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-contrast transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Working..." : "Login"}
              </button>
            </form>
          </div>
        </div>
        </section>
      </main>
      {providerChooser ? (portalTarget ? createPortal(providerChooser, portalTarget) : providerChooser) : null}
    </>
  );
}
