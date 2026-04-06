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
import { useI18n } from "./UiI18nContext";

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

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

type NotificationProviderProps = {
  children: ReactNode;
};

/**
 * Animated toast banner for the currently active notification.
 */
function NotificationBanner({
  notification,
  onDismiss,
  isVisible,
}: {
  notification: AppNotification;
  onDismiss: () => void;
  isVisible: boolean;
}) {
  const { t } = useI18n();
  const panelClassName =
    "border-line/80 bg-panel/95 text-ink shadow-[0_28px_90px_rgb(var(--color-shadow)/0.22)]";

  const variantLabels = {
    info: notification.title || t("notifications.notice"),
    success: notification.title || t("notifications.success"),
    warning: notification.title || t("notifications.warning"),
    error: notification.title || t("notifications.error"),
  } satisfies Record<AppNotificationVariant, string>;

  const variant = notification.variant || "info";
  const titleClassName = "text-ink-muted";
  const messageClassName = "text-ink";
  const closeButtonClassName =
    "border border-line/80 bg-canvas/80 text-ink-muted hover:bg-canvas hover:text-ink";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-3 transition-all duration-300 ease-out sm:top-4 sm:px-6 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0"
      }`}
    >
      <div
        className={`pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-[24px] border backdrop-blur-2xl transition-all duration-300 ease-out ${
          isVisible ? "scale-100" : "scale-[0.97]"
        } ${panelClassName}`}
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-start gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                titleClassName
              }`}
            >
              {variantLabels[variant]}
            </p>
            <p className={`mt-1 text-sm leading-6 ${messageClassName}`}>
              {notification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${closeButtonClassName}`}
            aria-label={t("notifications.dismiss")}
          >
            {t("common.close")}
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

    // Notifications are shown one at a time so each toast gets its full dwell and exit animation.
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

    // Delay the visible flag by one frame so CSS transitions animate from the hidden state.
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
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return value;
}
