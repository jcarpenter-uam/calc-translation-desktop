type ApiErrorShape = {
  error?: string;
  message?: string;
};

/**
 * Defines the baseURL for the api
 */
export function getApiBaseUrl() {
  const env = globalThis as typeof globalThis & {
    __APP_API_BASE_URL__?: string;
  };

  return env.__APP_API_BASE_URL__ || "/api";
}

/**
 * Typed API error with HTTP status and optional payload.
 */
export class ApiError extends Error {
  status: number;
  payload: ApiErrorShape | null;

  constructor(status: number, message: string, payload: ApiErrorShape | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export const buildApiUrl = (path: string) => `${getApiBaseUrl()}${path}`;

/**
 * Shared JSON request helper for API hooks.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const rawBody = await response.text();
  const parsedBody = rawBody.length > 0 ? safeJsonParse(rawBody) : null;

  if (!response.ok) {
    const errorPayload = parsedBody as ApiErrorShape | null;
    const message =
      errorPayload?.error ||
      errorPayload?.message ||
      `Request failed: ${response.status}`;
    throw new ApiError(response.status, message, errorPayload);
  }

  return parsedBody as T;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
