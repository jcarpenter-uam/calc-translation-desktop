import useSWR from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";

type ServerLogFile = {
  fileName: string | null;
  content: string;
};

export type ServerLogsResponse = {
  lines: number;
  combined: ServerLogFile;
  error: ServerLogFile;
};

const buildServerLogsPath = (lines = 300) =>
  `/server-logs/?lines=${encodeURIComponent(String(lines))}`;

export const serverLogsKey = (lines = 300) =>
  buildApiUrl(buildServerLogsPath(lines));

/**
 * Loads recent server logs for super admins.
 */
export function useServerLogs(enabled: boolean, lines = 300) {
  return useSWR<ServerLogsResponse, ApiError>(
    enabled ? serverLogsKey(lines) : null,
    () => apiRequest<ServerLogsResponse>(buildServerLogsPath(lines)),
    {
      revalidateOnFocus: false,
      refreshInterval: enabled ? 5000 : 0,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}
