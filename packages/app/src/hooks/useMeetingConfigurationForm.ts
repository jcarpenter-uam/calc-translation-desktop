import { useMemo, useState, type FormEvent } from "react";
import { useAppRoute } from "../contexts/RouteContext";
import { getLanguageFlagSrc, LanguageList } from "../languages/LanguageList";
import { ApiError } from "./api";
import { useCreateMeeting, useJoinMeeting } from "./meeting";

export type MeetingMethod = "one_way" | "two_way";

export type IntegrationOption = {
  value: string;
  label: string;
  description: string;
};

export const MAX_ONE_WAY_LANGUAGES = 5;

export const INTEGRATION_OPTIONS: IntegrationOption[] = [
  {
    value: "native",
    label: "Native room",
    description: "Use our in-app room and microphone flow.",
  },
  {
    value: "zoom",
    label: "Zoom",
    description: "Track a Zoom-hosted meeting in your setup details.",
  },
];

/**
 * Encapsulates host meeting configuration state and submission behavior.
 */
export function useMeetingConfigurationForm() {
  const { navigateToMeeting } = useAppRoute();
  const createMeeting = useCreateMeeting();
  const joinMeeting = useJoinMeeting();

  const [topic, setTopic] = useState("");
  const [method, setMethod] = useState<MeetingMethod>("one_way");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [languageQuery, setLanguageQuery] = useState("");
  const [integration, setIntegration] = useState("native");
  const [externalJoinUrl, setExternalJoinUrl] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedLanguageOptions = useMemo(() => {
    return LanguageList.filter((option) => selectedLanguages.includes(option.value));
  }, [selectedLanguages]);

  const filteredLanguageOptions = useMemo(() => {
    const query = languageQuery.trim().toLowerCase();
    if (!query) {
      return LanguageList;
    }

    return LanguageList.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query),
    );
  }, [languageQuery]);

  const hasValidZoomJoinUrl = useMemo(() => {
    if (integration !== "zoom") {
      return true;
    }

    const trimmedJoinUrl = externalJoinUrl.trim();
    if (!trimmedJoinUrl) {
      return false;
    }

    try {
      new URL(trimmedJoinUrl);
      return true;
    } catch {
      return false;
    }
  }, [externalJoinUrl, integration]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) {
      return false;
    }

    if (method === "two_way") {
      return selectedLanguages.length === 2 && hasValidZoomJoinUrl;
    }

    return (
      selectedLanguages.length > 0 &&
      selectedLanguages.length <= MAX_ONE_WAY_LANGUAGES &&
      hasValidZoomJoinUrl
    );
  }, [hasValidZoomJoinUrl, isSubmitting, method, selectedLanguages.length]);

  const toggleLanguage = (languageCode: string) => {
    if (
      method === "two_way" &&
      !selectedLanguages.includes(languageCode) &&
      selectedLanguages.length >= 2
    ) {
      setSubmitError(
        "Two-way meetings need exactly two languages. Deselect one to choose another.",
      );
      return;
    }

    if (
      method === "one_way" &&
      !selectedLanguages.includes(languageCode) &&
      selectedLanguages.length >= MAX_ONE_WAY_LANGUAGES
    ) {
      setSubmitError(
        `One-way meetings can include at most ${MAX_ONE_WAY_LANGUAGES} spoken languages.`,
      );
      return;
    }

    setSubmitError(null);
    setSelectedLanguages((current) => {
      const alreadySelected = current.includes(languageCode);
      if (method === "two_way") {
        return alreadySelected
          ? current.filter((value) => value !== languageCode)
          : [...current, languageCode];
      }

      return alreadySelected
        ? current.filter((value) => value !== languageCode)
        : [...current, languageCode];
    });
  };

  const handleMethodChange = (nextMethod: MeetingMethod) => {
    setMethod(nextMethod);
    setSubmitError(null);
    setSelectedLanguages((current) =>
      nextMethod === "two_way" ? current.slice(0, 2) : current,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (method === "two_way" && selectedLanguages.length !== 2) {
      setSubmitError("Two-way meetings need exactly two languages before you can start.");
      return;
    }

    if (method === "one_way" && selectedLanguages.length > MAX_ONE_WAY_LANGUAGES) {
      setSubmitError(
        `One-way meetings can include at most ${MAX_ONE_WAY_LANGUAGES} spoken languages.`,
      );
      return;
    }

    if (method === "one_way" && selectedLanguages.length === 0) {
      setSubmitError("One-way meetings need at least one spoken language before you can start.");
      return;
    }

    if (integration === "zoom") {
      try {
        if (!externalJoinUrl.trim()) {
          throw new Error("missing");
        }

        new URL(externalJoinUrl);
      } catch {
        setSubmitError("Zoom meetings require a valid meeting URL before you can start.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createdMeeting = await createMeeting({
        topic: topic.trim() || undefined,
        method,
        languages: selectedLanguages,
        integration,
        join_url: integration === "zoom" ? externalJoinUrl.trim() : undefined,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
      });

      const joinedMeeting = await joinMeeting(createdMeeting.readableId);
      navigateToMeeting({
        meetingId: joinedMeeting.meetingId,
        readableId: joinedMeeting.readableId,
        ticket: joinedMeeting.token,
        isHost: joinedMeeting.isHost,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to create and start the meeting.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    topic,
    setTopic,
    method,
    handleMethodChange,
    selectedLanguages,
    selectedLanguageOptions,
    filteredLanguageOptions,
    languageQuery,
    setLanguageQuery,
    integration,
    setIntegration,
    externalJoinUrl,
    setExternalJoinUrl,
    scheduledTime,
    setScheduledTime,
    isSubmitting,
    submitError,
    setSubmitError,
    canSubmit,
    toggleLanguage,
    handleSubmit,
    getLanguageFlagSrc,
  };
}
