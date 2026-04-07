import { useEffect, useMemo, useRef, useState } from "react";
import "@sjmc11/tourguidejs/dist/css/tour.min.css";
import * as tourguide from "@sjmc11/tourguidejs";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/UiI18nContext";
import { type AppRoute, useAppRoute } from "../contexts/RouteContext";
import { useUpdateMyProfile } from "../hooks/user";
import {
  dispatchTourUiEvent,
  TOUR_CLOSE_SHELL_OVERLAYS_EVENT,
  TOUR_OPEN_SETTINGS_EVENT,
  TOUR_RESTART_DASHBOARD_EVENT,
} from "./events";
import "./tour.css";

type TourName = "dashboard" | "meetingHost" | "meetingViewer";

type TourDefinition = {
  name: TourName;
  isCompleted: boolean;
  steps: TourStep[];
};

type TourStep = {
  title: string;
  content: string;
  target: string;
  dialogTarget: string;
  propagateEvents: boolean;
  beforeEnter?: (_currentStep: unknown, _nextStep: unknown) => void | Promise<unknown>;
};

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForSelector(selector: string, timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const element = globalThis.document?.querySelector?.(selector);
    if (element) {
      return element;
    }

    await wait(50);
  }

  return null;
}

function createStep(config: {
  title: string;
  content: string;
  target: string;
  dialogTarget?: string;
  beforeEnter?: () => Promise<unknown> | unknown;
}) {
  return {
    title: config.title,
    content: `<div class="calc-tour-copy">${config.content}</div>`,
    target: config.target,
    dialogTarget: config.dialogTarget || config.target,
    propagateEvents: true,
    beforeEnter: config.beforeEnter
      ? async (_currentStep: unknown, _nextStep: unknown) => {
          await config.beforeEnter?.();
        }
      : undefined,
  };
}

function createTourClient(
  nextLabel: string,
  prevLabel: string,
  finishLabel: string,
  steps: TourStep[],
) {
  return new tourguide.TourGuideClient({
    activeStepInteraction: true,
    autoScroll: true,
    backdropAnimate: true,
    backdropClass: "calc-tour-backdrop",
    backdropColor: "rgba(24, 24, 27, 0.58)",
    closeButton: true,
    completeOnFinish: false,
    dialogAnimate: true,
    dialogClass: "calc-tour-dialog",
    dialogMaxWidth: 380,
    exitOnClickOutside: false,
    exitOnEscape: true,
    finishLabel,
    keyboardControls: true,
    nextLabel,
    prevLabel,
    rememberStep: false,
    showStepDots: true,
    showStepProgress: true,
    steps,
    targetPadding: 18,
  });
}

function isDashboardTourRoute(route: string) {
  return route === "home" || route === "configure" || route === "calendar";
}

async function clickElement(selector: string) {
  const element = await waitForSelector(selector);
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.click();
}

async function navigateToRoute(
  navigateTo: (route: AppRoute) => void,
  route: "home" | "calendar",
) {
  navigateTo(route);
  await wait(150);
}

export function AppTourManager() {
  const { status, user } = useAuth();
  const { meeting, navigateTo, route } = useAppRoute();
  const { t } = useI18n();
  const updateMyProfile = useUpdateMyProfile();
  const tourRef = useRef<tourguide.TourGuideClient | null>(null);
  const activeTourNameRef = useRef<TourName | null>(null);
  const completedByFinishRef = useRef(false);
  const completionRecordedRef = useRef(false);
  const pendingForcedTourRef = useRef<TourName | null>(null);
  const [activeTourName, setActiveTourName] = useState<TourName | null>(null);
  const [forcedTourNonce, setForcedTourNonce] = useState(0);

  const markTourCompleted = (tourName: TourName) => {
    if (completionRecordedRef.current) {
      return;
    }

    completionRecordedRef.current = true;
    void updateMyProfile(
      tourName === "dashboard"
        ? { hasCompletedDashboardTour: true }
        : { hasCompletedMeetingTour: true },
    );
  };

  const dashboardTour = useMemo<TourDefinition | null>(() => {
    if (!user?.id) {
      return null;
    }

    return {
      name: "dashboard",
      isCompleted: user.hasCompletedDashboardTour,
      steps: [
        createStep({
          title: t("tour.dashboard.quickJoinTitle"),
          content: t("tour.dashboard.quickJoinBody"),
          target: "#joinUrl",
          dialogTarget: "#joinUrl",
        }),
        createStep({
          title: t("tour.dashboard.configureTitle"),
          content: t("tour.dashboard.configureBody"),
          target: "#tour-configure-meeting",
          dialogTarget: "#tour-configure-meeting",
        }),
        createStep({
          title: t("tour.dashboard.configureDetailsTitle"),
          content: t("tour.dashboard.configureDetailsBody"),
          target: "#meeting-topic",
          dialogTarget: "#meeting-topic",
          beforeEnter: async () => {
            if (route === "home") {
              await clickElement("#tour-configure-meeting");
            }
            await waitForSelector("#meeting-topic");
          },
        }),
        createStep({
          title: t("tour.dashboard.configureLanguagesTitle"),
          content: t("tour.dashboard.configureLanguagesBody"),
          target: "#tour-configure-translation",
          dialogTarget: "#tour-configure-language-search",
          beforeEnter: async () => {
            await waitForSelector("#tour-configure-translation");
          },
        }),
        createStep({
          title: t("tour.dashboard.configureCreateTitle"),
          content: t("tour.dashboard.configureCreateBody"),
          target: "#tour-configure-create-meeting",
          dialogTarget: "#tour-configure-create-meeting",
          beforeEnter: async () => {
            await waitForSelector("#tour-configure-create-meeting");
          },
        }),
        createStep({
          title: t("tour.dashboard.calendarTitle"),
          content: t("tour.dashboard.calendarBody"),
          target: "#tour-calendar-page",
          dialogTarget: "#tour-calendar-sync-section",
          beforeEnter: async () => {
            if (route !== "calendar") {
              await navigateToRoute(navigateTo, "calendar");
            }
            await waitForSelector("#tour-calendar-page");
          },
        }),
        createStep({
          title: t("tour.dashboard.calendarManualSyncTitle"),
          content: t("tour.dashboard.calendarManualSyncBody"),
          target: "#tour-calendar-manual-sync",
          dialogTarget: "#tour-calendar-manual-sync",
          beforeEnter: async () => {
            if (route !== "calendar") {
              await navigateToRoute(navigateTo, "calendar");
            }
            await waitForSelector("#tour-calendar-manual-sync");
          },
        }),
        createStep({
          title: t("tour.dashboard.userMenuTitle"),
          content: t("tour.dashboard.userMenuBody"),
          target: "#tour-user-menu-trigger",
          dialogTarget: "#tour-user-menu-trigger",
          beforeEnter: async () => {
            if (route === "configure") {
              await clickElement("#tour-configure-back");
            } else if (route === "calendar") {
              await clickElement("#tour-calendar-back");
            }
            await waitForSelector("#tour-user-menu-trigger");
          },
        }),
        createStep({
          title: t("tour.dashboard.languageTitle"),
          content: t("tour.dashboard.languageBody"),
          target: "#language-select",
          dialogTarget: "#language-select",
          beforeEnter: async () => {
            dispatchTourUiEvent(TOUR_OPEN_SETTINGS_EVENT);
            await waitForSelector("#language-select");
          },
        }),
        createStep({
          title: t("tour.dashboard.translateUiTitle"),
          content: t("tour.dashboard.translateUiBody"),
          target: "#tour-ui-translation-toggle",
          dialogTarget: "#tour-ui-translation-toggle",
          beforeEnter: async () => {
            dispatchTourUiEvent(TOUR_OPEN_SETTINGS_EVENT);
            await waitForSelector("#tour-ui-translation-toggle");
          },
        }),
      ],
    };
  }, [navigateTo, route, t, user?.hasCompletedDashboardTour, user?.id]);

  const hostMeetingTour = useMemo<TourDefinition | null>(() => {
    if (!user?.id) {
      return null;
    }

    return {
      name: "meetingHost",
      isCompleted: user.hasCompletedMeetingTour,
      steps: [
        createStep({
          title: t("tour.meeting.participantsTitle"),
          content: t("tour.meeting.participantsBody"),
          target: "#tour-meeting-participants",
          dialogTarget: "#tour-meeting-participants",
        }),
        createStep({
          title: t("tour.meeting.transcriptTitle"),
          content: t("tour.meeting.transcriptBody"),
          target: "#tour-meeting-transcript",
          dialogTarget: "#tour-meeting-transcript",
        }),
        createStep({
          title: t("tour.meeting.controlsTitle"),
          content: t("tour.meeting.controlsBody"),
          target: "#tour-meeting-host-controls",
          dialogTarget: "#tour-meeting-host-controls",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-host-controls");
          },
        }),
        createStep({
          title: t("tour.meeting.inviteTitle"),
          content: t("tour.meeting.inviteBody"),
          target: "#tour-meeting-invite",
          dialogTarget: "#tour-meeting-invite",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-invite");
          },
        }),
        createStep({
          title: t("tour.meeting.micCheckTitle"),
          content: t("tour.meeting.micCheckBody"),
          target: "#tour-meeting-mic-check",
          dialogTarget: "#tour-meeting-mic-check",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-mic-check");
          },
        }),
        createStep({
          title: t("tour.meeting.deviceTitle"),
          content: t("tour.meeting.deviceBody"),
          target: "#tour-meeting-device-select",
          dialogTarget: "#tour-meeting-device-select",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-device-select");
          },
        }),
        createStep({
          title: t("tour.meeting.audioTitle"),
          content: t("tour.meeting.audioBody"),
          target: "#tour-meeting-join-audio",
          dialogTarget: "#tour-meeting-join-audio",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-join-audio");
          },
        }),
        createStep({
          title: t("tour.meeting.muteTitle"),
          content: t("tour.meeting.muteBody"),
          target: "#tour-meeting-mute",
          dialogTarget: "#tour-meeting-mute",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-mute");
          },
        }),
        createStep({
          title: t("tour.meeting.endTitle"),
          content: t("tour.meeting.endBody"),
          target: "#tour-meeting-end",
          dialogTarget: "#tour-meeting-end",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-end");
          },
        }),
        createStep({
          title: t("tour.meeting.hostLeaveTitle"),
          content: t("tour.meeting.hostLeaveBody"),
          target: "#tour-meeting-host-leave",
          dialogTarget: "#tour-meeting-host-leave",
          beforeEnter: async () => {
            await clickElement("#tour-meeting-show-controls");
            await waitForSelector("#tour-meeting-host-leave");
          },
        }),
      ],
    };
  }, [t, user?.hasCompletedMeetingTour, user?.id]);

  const viewerMeetingTour = useMemo<TourDefinition | null>(() => {
    if (!user?.id) {
      return null;
    }

    return {
      name: "meetingViewer",
      isCompleted: user.hasCompletedMeetingTour,
      steps: [
        createStep({
          title: t("tour.meeting.participantsTitle"),
          content: t("tour.meeting.participantsBody"),
          target: "#tour-meeting-participants",
          dialogTarget: "#tour-meeting-participants",
        }),
        createStep({
          title: t("tour.meeting.transcriptTitle"),
          content: t("tour.meeting.transcriptBody"),
          target: "#tour-meeting-transcript",
          dialogTarget: "#tour-meeting-transcript",
        }),
        createStep({
          title: t("tour.meeting.leaveTitle"),
          content: t("tour.meeting.leaveBody"),
          target: "#tour-meeting-viewer-leave",
          dialogTarget: "#tour-meeting-viewer-leave",
        }),
      ],
    };
  }, [t, user?.hasCompletedMeetingTour, user?.id]);

  const meetingTour = route !== "meeting"
    ? null
    : meeting?.isHost
      ? hostMeetingTour
      : viewerMeetingTour;

  useEffect(() => {
    const browser = globalThis as typeof globalThis & {
      addEventListener?: (name: string, listener: EventListener) => void;
      removeEventListener?: (name: string, listener: EventListener) => void;
    };

    const restartDashboardTour = () => {
      if (!user?.id) {
        return;
      }

      void updateMyProfile({
        hasCompletedDashboardTour: false,
        hasCompletedMeetingTour: false,
      });
      navigateTo("home");
      pendingForcedTourRef.current = "dashboard";
      if (activeTourNameRef.current) {
        void tourRef.current?.exit();
      }
      setForcedTourNonce((current) => current + 1);
    };

    browser.addEventListener?.(TOUR_RESTART_DASHBOARD_EVENT, restartDashboardTour);

    return () => {
      browser.removeEventListener?.(TOUR_RESTART_DASHBOARD_EVENT, restartDashboardTour);
    };
  }, [navigateTo, updateMyProfile, user?.id]);

  useEffect(() => {
    return () => {
      dispatchTourUiEvent(TOUR_CLOSE_SHELL_OVERLAYS_EVENT);
      if (tourRef.current) {
        void tourRef.current.exit();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTourName === "dashboard" && !isDashboardTourRoute(route)) {
      dispatchTourUiEvent(TOUR_CLOSE_SHELL_OVERLAYS_EVENT);
      void tourRef.current?.exit();
    }

    if ((activeTourName === "meetingHost" || activeTourName === "meetingViewer") && route !== "meeting") {
      void tourRef.current?.exit();
    }
  }, [activeTourName, route]);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id || user.languageCode === null) {
      return;
    }

    const forcedTourName = pendingForcedTourRef.current;
    const nextTour =
      forcedTourName === "dashboard"
        ? dashboardTour
        : forcedTourName === "meetingHost" || forcedTourName === "meetingViewer"
          ? meetingTour
          : isDashboardTourRoute(route)
            ? dashboardTour
            : route === "meeting"
              ? meetingTour
              : null;

    if (!nextTour || nextTour.steps.length === 0) {
      return;
    }

    if (activeTourNameRef.current) {
      return;
    }

    if (!forcedTourName && nextTour.isCompleted) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        const firstTarget = nextTour.steps[0]?.target;
        if (typeof firstTarget === "string") {
          const target = await waitForSelector(firstTarget, route === "meeting" ? 6000 : 3000);
          if (!target || cancelled) {
            return;
          }
        }

        const client = createTourClient(
          t("tour.next"),
          t("tour.back"),
          t("tour.finish"),
          nextTour.steps,
        );

        completedByFinishRef.current = false;
        completionRecordedRef.current = false;
        activeTourNameRef.current = nextTour.name;
        pendingForcedTourRef.current = null;
        tourRef.current = client;
        setActiveTourName(nextTour.name);

        client.onFinish(() => {
          completedByFinishRef.current = true;
          markTourCompleted(nextTour.name);
        });

        client.onAfterExit(() => {
          markTourCompleted(nextTour.name);
          if (activeTourNameRef.current === "dashboard") {
            dispatchTourUiEvent(TOUR_CLOSE_SHELL_OVERLAYS_EVENT);
          }
          activeTourNameRef.current = null;
          completedByFinishRef.current = false;
          completionRecordedRef.current = false;
          tourRef.current = null;
          setActiveTourName(null);
        });

        void client.start();
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dashboardTour, forcedTourNonce, meetingTour, route, status, t, updateMyProfile, user?.id, user?.languageCode]);

  return null;
}
