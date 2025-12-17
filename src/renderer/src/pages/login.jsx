import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/auth";
import { useLanguage } from "../context/language.jsx";

export default function Login() {
  const { t } = useTranslation();
  const { checkAuth, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [infoMessage, setInfoMessage] = useState(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
      const response = await window.electron.requestLogin(email, language);

      if (response.status !== "ok") {
        throw new Error(response.message || "An unknown error occurred.");
      }

      const data = response.data;

      if (data.login_url) {
        await window.electron.startAuthFlow(data.login_url);

        await checkAuth();
      } else {
        throw new Error("Could not retrieve login URL.");
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="text-center sm:text-left space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {t("login")}
              </h1>
              <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t("login_description")}
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
                  {t("email_label")}
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
                    placeholder={t("email_placeholder")}
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
                <div className="text-red-600 dark:text-red-400 text-sm font-medium text-center">
                  <strong>{t("error_label")}</strong> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? t("redirecting") : t("continue")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
