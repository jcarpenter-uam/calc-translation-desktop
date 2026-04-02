export type TranscriptDisplayMode = "translated_only" | "transcribed_only" | "both";

export type TranscriptItem = {
  id: string;
  utteranceOrder: number | null;
  language: string;
  speaker: string | null;
  isFinal: boolean;
  transcriptionText: string | null;
  translationText: string | null;
  sourceLanguage: string | null;
};

export type RenderedTranscriptItem = {
  id: string;
  utteranceOrder: number | null;
  language: string;
  speaker: string | null;
  isFinal: boolean;
  primaryText: string;
  secondaryText: string | null;
};

function compareTranscriptItems(left: TranscriptItem, right: TranscriptItem) {
  const leftOrder = left.utteranceOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.utteranceOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  if (left.isFinal !== right.isFinal) {
    return left.isFinal ? -1 : 1;
  }

  return left.id.localeCompare(right.id);
}

export function upsertTranscriptItem(current: TranscriptItem[], incoming: TranscriptItem) {
  const next = [...current];

  const existingIndex = next.findIndex((item) => {
    if (
      incoming.utteranceOrder !== null &&
      item.utteranceOrder !== null &&
      item.utteranceOrder === incoming.utteranceOrder
    ) {
      return true;
    }

    return item.language === incoming.language && !item.isFinal && item.utteranceOrder === null;
  });

  if (existingIndex >= 0) {
    next[existingIndex] = incoming;
  } else {
    next.push(incoming);
  }

  return next.sort(compareTranscriptItems).slice(-300);
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export function hasTranslatedTranscriptContent(item: TranscriptItem) {
  const transcriptionText = normalizeText(item.transcriptionText);
  const translationText = normalizeText(item.translationText);

  return Boolean(
    translationText && transcriptionText && translationText !== transcriptionText,
  );
}

export function renderTranscriptItem(
  item: TranscriptItem,
  mode: TranscriptDisplayMode,
  viewerLanguage?: string | null,
): RenderedTranscriptItem {
  const transcriptionText = normalizeText(item.transcriptionText);
  const translationText = normalizeText(item.translationText);
  const sourceLanguage = normalizeText(item.sourceLanguage);

  let primaryText = translationText || transcriptionText || "";
  let secondaryText: string | null = null;

  if (item.language === "two_way") {
    const preferTranscriptionFirst = Boolean(
      viewerLanguage && sourceLanguage && viewerLanguage === sourceLanguage,
    );

    primaryText = preferTranscriptionFirst
      ? transcriptionText || translationText || ""
      : translationText || transcriptionText || "";
    secondaryText =
      translationText && transcriptionText && translationText !== transcriptionText
        ? preferTranscriptionFirst
          ? translationText
          : transcriptionText
        : null;
  } else if (mode === "transcribed_only") {
    primaryText = transcriptionText || translationText || "";
  } else if (mode === "both") {
    primaryText = translationText || transcriptionText || "";
    secondaryText =
      translationText && transcriptionText && translationText !== transcriptionText
        ? transcriptionText
        : null;
  }

  return {
    id: item.id,
    utteranceOrder: item.utteranceOrder,
    language: item.language,
    speaker: item.speaker,
    isFinal: item.isFinal,
    primaryText,
    secondaryText,
  };
}
