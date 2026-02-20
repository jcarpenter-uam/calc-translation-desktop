export const TOUR_GROUP = "app-onboarding-v1";

const WAIT_ATTEMPTS = 40;
const WAIT_MS = 100;

async function waitForSelector(selector, attempt = 0) {
  if (document.querySelector(selector)) {
    return true;
  }
  if (attempt >= WAIT_ATTEMPTS) {
    return false;
  }
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  return waitForSelector(selector, attempt + 1);
}

async function waitForNoSelector(selector, attempt = 0) {
  if (!document.querySelector(selector)) {
    return true;
  }
  if (attempt >= WAIT_ATTEMPTS) {
    return false;
  }
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  return waitForNoSelector(selector, attempt + 1);
}

export function getOnboardingTourSteps(navigate, t) {
  const ensureLandingPage = async () => {
    navigate("/");
    await waitForSelector("#user-avatar-btn-desktop");
  };

  const ensureSettingsModalClosed = async () => {
    const closeBtn = document.querySelector("#settings-close-btn-desktop");
    if (closeBtn) {
      closeBtn.click();
      await waitForNoSelector("#settings-modal-desktop");
    }
  };

  const ensureDropdownOpen = async () => {
    if (!document.querySelector("#user-settings-btn-desktop")) {
      const avatarBtn = document.querySelector("#user-avatar-btn-desktop");
      avatarBtn?.click();
      await waitForSelector("#user-settings-btn-desktop");
    }
  };

  const ensureDropdownClosed = async () => {
    if (document.querySelector("#user-settings-btn-desktop")) {
      const avatarBtn = document.querySelector("#user-avatar-btn-desktop");
      avatarBtn?.click();
      await waitForNoSelector("#user-settings-btn-desktop");
    }
  };

  const ensureLandingClean = async () => {
    await ensureLandingPage();
    await ensureSettingsModalClosed();
    await ensureDropdownClosed();
  };

  const ensureSettingsShortcutState = async (_currentStep, nextStep) => {
    await ensureLandingPage();
    await ensureSettingsModalClosed();
    await ensureDropdownOpen();
    const settingsBtn = document.querySelector("#user-settings-btn-desktop");
    const avatarBtn = document.querySelector("#user-avatar-btn-desktop");
    nextStep.target = settingsBtn || avatarBtn || document.body;
    nextStep.dialogTarget = settingsBtn || avatarBtn || document.body;
  };

  const openSettingsModal = async () => {
    await ensureLandingPage();
    if (document.querySelector("#settings-modal-desktop")) {
      return;
    }
    await ensureDropdownOpen();
    const settingsBtn = document.querySelector("#user-settings-btn-desktop");
    settingsBtn?.click();
    await waitForSelector("#settings-modal-desktop");
  };

  const focusSettingsModal = async (_currentStep, nextStep, dialogTargetId) => {
    await openSettingsModal();
    const modal = document.querySelector("#settings-modal-desktop");
    const dialogTarget = document.querySelector(dialogTargetId);
    nextStep.target = modal || dialogTarget || document.body;
    nextStep.dialogTarget = dialogTarget || modal || document.body;
  };

  return [
    {
      target: "#user-avatar-btn-desktop",
      group: TOUR_GROUP,
      title: t("tour_user_menu_title"),
      content: t("tour_user_menu_content"),
      beforeEnter: ensureLandingClean,
    },
    {
      target: "#user-settings-btn-desktop",
      group: TOUR_GROUP,
      title: t("tour_settings_shortcut_title"),
      content: t("tour_settings_shortcut_content"),
      beforeEnter: ensureSettingsShortcutState,
    },
    {
      target: "#settings-modal-desktop",
      group: TOUR_GROUP,
      title: t("tour_settings_theme_title"),
      content: t("tour_settings_theme_content"),
      beforeEnter: (currentStep, nextStep) =>
        focusSettingsModal(currentStep, nextStep, "#settings-theme-row-desktop"),
    },
    {
      target: "#settings-modal-desktop",
      group: TOUR_GROUP,
      title: t("tour_settings_language_title"),
      content: t("tour_settings_language_content"),
      beforeEnter: (currentStep, nextStep) =>
        focusSettingsModal(
          currentStep,
          nextStep,
          "#settings-language-row-desktop",
        ),
    },
    {
      target: "#settings-modal-desktop",
      group: TOUR_GROUP,
      title: t("tour_settings_ui_translation_title"),
      content: t("tour_settings_ui_translation_content"),
      beforeEnter: (currentStep, nextStep) =>
        focusSettingsModal(
          currentStep,
          nextStep,
          "#settings-ui-translation-row-desktop",
        ),
    },
    {
      target: "#settings-modal-desktop",
      group: TOUR_GROUP,
      title: t("tour_settings_display_mode_title"),
      content: t("tour_settings_display_mode_content"),
      beforeEnter: (currentStep, nextStep) =>
        focusSettingsModal(
          currentStep,
          nextStep,
          "#settings-display-mode-row-desktop",
        ),
      afterLeave: () => {
        const closeBtn = document.querySelector("#settings-close-btn-desktop");
        closeBtn?.click();
      },
    },
    {
      target: "#landing-calendar-panel-desktop",
      group: TOUR_GROUP,
      title: t("tour_calendar_join_title"),
      content: t("tour_calendar_join_content"),
      beforeEnter: async () => {
        await ensureLandingClean();
        const calendarTab = document.querySelector("#landing-calendar-tab-desktop");
        calendarTab?.click();
        await waitForSelector("#landing-calendar-panel-desktop");
      },
    },
    {
      target: "#landing-zoom-panel-desktop",
      group: TOUR_GROUP,
      title: t("tour_zoom_integration_title"),
      content: t("tour_zoom_integration_content"),
      beforeEnter: async () => {
        await ensureLandingClean();
        const zoomTab = document.querySelector("#landing-zoom-tab-desktop");
        zoomTab?.click();
        await waitForSelector("#landing-zoom-panel-desktop");
      },
    },
    {
      target: "#landing-standalone-panel-desktop",
      group: TOUR_GROUP,
      title: t("tour_standalone_mode_title"),
      content: t("tour_standalone_mode_content"),
      beforeEnter: async () => {
        await ensureLandingClean();
        const standaloneTab = document.querySelector(
          "#landing-standalone-tab-desktop",
        );
        standaloneTab?.click();
        await waitForSelector("#landing-standalone-panel-desktop");
      },
    },
    {
      target: "#landing-to-standalone-btn-desktop",
      group: TOUR_GROUP,
      title: t("tour_standalone_host_title"),
      content: t("tour_standalone_host_content"),
      beforeEnter: async () => {
        await ensureLandingClean();
        const standaloneTab = document.querySelector(
          "#landing-standalone-tab-desktop",
        );
        standaloneTab?.click();
        await waitForSelector("#landing-to-standalone-btn-desktop");
      },
    },
    {
      target: "#standalone-supported-langs-desktop",
      group: TOUR_GROUP,
      title: t("tour_supported_languages_title"),
      content: t("tour_supported_languages_content"),
      beforeEnter: async () => {
        await ensureSettingsModalClosed();
        navigate("/standalone/host");
        await waitForSelector("#standalone-supported-langs-desktop");
      },
    },
    {
      target: "#standalone-one-way-card-desktop",
      group: TOUR_GROUP,
      title: t("tour_one_way_translation_title"),
      content: t("tour_one_way_translation_content"),
    },
    {
      target: "#standalone-two-way-card-desktop",
      group: TOUR_GROUP,
      title: t("tour_two_way_translation_title"),
      content: t("tour_two_way_translation_content"),
    },
  ];
}
