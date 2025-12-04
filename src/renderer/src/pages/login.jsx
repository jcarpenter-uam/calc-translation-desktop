import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Titlebar from "../components/title/titlebar.jsx";
import { SettingsButton } from "../models/settings.jsx";
import { EnvelopeSimple } from "@phosphor-icons/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "zoom_link_required") {
      sessionStorage.setItem("zoom_link_pending", "true");
      setInfoMessage("Please log in to finish linking your new Zoom account.");
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.electron.requestLogin(email);

      if (response.status !== "ok") {
        throw new Error(response.message || "An unknown error occurred.");
      }

      const data = response.data;

      if (data.login_url) {
        await window.electron.startAuthFlow(data.login_url);
      } else {
        throw new Error("Could not retrieve login URL.");
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Titlebar>
        <SettingsButton />
      </Titlebar>

      <main className="flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="text-center sm:text-left space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Enter your work email to access your dashboard and manage your
                  translations securely.
                </p>
              </div>

              {infoMessage && (
                <div className="mt-4 p-3 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm">
                  {infoMessage}
                </div>
              )}
            </div>

            {/* Right Column: The Form */}
            <div className="w-full max-w-sm mx-auto sm:ml-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1"
                  >
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-blue-500 transition-colors">
                      <EnvelopeSimple size={20} weight="duotone" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@company.com"
                      required
                      className="
                        block w-full pl-10 pr-3 py-2.5 
                        bg-white dark:bg-zinc-800
                        border border-zinc-300 dark:border-zinc-600
                        rounded-xl 
                        text-zinc-900 dark:text-white 
                        placeholder-zinc-400 dark:placeholder-zinc-500 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 
                        transition-all duration-200 ease-out
                      "
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    w-full py-2.5 px-4 
                    bg-blue-600 hover:bg-blue-700 
                    text-white font-semibold text-sm
                    rounded-xl shadow-md shadow-blue-600/10 hover:shadow-blue-600/20
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900
                    disabled:opacity-70 disabled:cursor-not-allowed 
                    transition-all duration-200 transform active:scale-[0.98]
                  "
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Redirecting...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
