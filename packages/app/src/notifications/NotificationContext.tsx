import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AppNotificationVariant = "info" | "success" | "warning" | "error";

type AppNotificationInput = {
  title?: string;
  message: string;
  variant?: AppNotificationVariant;
  durationMs?: number;
};

type AppNotification = AppNotificationInput & {
  id: string;
};

type NotificationContextValue = {
  notify: (notification: AppNotificationInput) => void;
  dismiss: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

type NotificationProviderProps = {
  children: ReactNode;
};

function NotificationBanner({
  notification,
  onDismiss,
  isVisible,
}: {
  notification: AppNotification;
  onDismiss: () => void;
  isVisible: boolean;
}) {
  const toneClasses = {
    info: "border-sky-300/45 bg-white/85 text-slate-900",
    success: "border-lime/45 bg-white/88 text-slate-900",
    warning: "border-amber-300/55 bg-white/88 text-slate-900",
    error: "border-rose-300/55 bg-white/88 text-slate-900",
  } satisfies Record<AppNotificationVariant, string>;

  const accentClasses = {
    info: "bg-sky-500",
    success: "bg-lime",
    warning: "bg-amber-400",
    error: "bg-rose-500",
  } satisfies Record<AppNotificationVariant, string>;

  const variant = notification.variant || "info";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-3 transition-all duration-300 ease-out sm:top-4 sm:px-6 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"
      }`}
    >
      <div
        className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-[22px] border shadow-[0_20px_70px_rgba(15,23,42,0.22)] backdrop-blur-2xl transition-all duration-300 ease-out ${
          isVisible ? "scale-100" : "scale-[0.97]"
        } ${toneClasses[variant]}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
          <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accentClasses[variant]}`} />
          <div className="min-w-0 flex-1">
            {notification.title ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {notification.title}
              </p>
            ) : null}
            <p className="mt-0.5 text-sm leading-5 text-slate-900">
              {notification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:border-lime hover:text-lime"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const notify = useCallback((notification: AppNotificationInput) => {
    const next: AppNotification = {
      id: crypto.randomUUID(),
      variant: notification.variant || "info",
      durationMs: notification.durationMs || 4200,
      ...notification,
    };

    setQueue((currentQueue) => [...currentQueue, next]);
  }, []);

  useEffect(() => {
    if (current || queue.length === 0) {
      return;
    }

    const [next, ...rest] = queue;
    setCurrent(next || null);
    setQueue(rest);
  }, [current, queue]);

  useEffect(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (!current) {
      setIsVisible(false);
      return;
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      showTimeoutRef.current = null;
    }, 16);

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    };
  }, [current]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!current) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
      timeoutRef.current = null;
    }, current.durationMs || 4200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [current]);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (current && !isVisible) {
      hideTimeoutRef.current = setTimeout(() => {
        setCurrent(null);
        hideTimeoutRef.current = null;
      }, 280);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [current, isVisible]);

  const value = useMemo(
    () => ({
      notify,
      dismiss,
    }),
    [dismiss, notify],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {current ? (
        <NotificationBanner
          notification={current}
          onDismiss={dismiss}
          isVisible={isVisible}
        />
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }

  return value;
}
