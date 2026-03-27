import useSWR, { useSWRConfig } from "swr";
import { apiRequest, ApiError, buildApiUrl } from "./api";
import type { ClientLogEntry } from "../bugReports/clientLogger";
import type { ClientType } from "../contexts/AppInfoContext";

export type BugReport = {
  id: string;
  createdAt: string;
  userId: string | null;
  tenantId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  status: "open" | "resolved";
  title: string;
  description: string;
  currentRoute: string | null;
  clientType: ClientType;
  osPlatform: "windows" | "linux" | "macos" | "unknown";
  appVersion: string;
  browserName: string | null;
  browserVersion: string | null;
  userAgent: string | null;
  clientLogFileName: string | null;
  clientLogFileContent: string | null;
  clientLogs: ClientLogEntry[];
};

type BugReportListResponse = {
  reports: BugReport[];
};

type CreateBugReportPayload = {
  title: string;
  description: string;
  currentRoute: string | null;
  clientLogFileName: string;
  clientLogFileContent: string;
  clientMetadata: {
    clientType: ClientType;
    osPlatform: "windows" | "linux" | "macos" | "unknown";
    appVersion: string;
    browserName: string | null;
    browserVersion: string | null;
    userAgent: string | null;
  };
  clientLogs: ClientLogEntry[];
};

type CreateBugReportResponse = {
  message: string;
  report: BugReport | null;
};

type UpdateBugReportStatusResponse = {
  message: string;
  report: BugReport;
};

export const bugReportsKey = (status?: "open" | "resolved" | "all") => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return buildApiUrl(`/bug-reports/${query}`);
};

/**
 * Loads bug reports for super-admin review.
 */
export function useBugReports(
  enabled: boolean,
  status: "open" | "resolved" | "all" = "open",
) {
  const path = `/bug-reports/?status=${status}`;

  return useSWR<BugReportListResponse, ApiError>(
    enabled ? bugReportsKey(status) : null,
    () => apiRequest<BugReportListResponse>(path),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (error: ApiError) => error.status >= 500,
    },
  );
}

/**
 * Submits a bug report on behalf of the authenticated user.
 */
export async function submitBugReport(payload: CreateBugReportPayload) {
  return apiRequest<CreateBugReportResponse>("/bug-reports/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Updates a bug report status and refreshes cached report lists.
 */
export function useUpdateBugReportStatus() {
  const { mutate } = useSWRConfig();

  return async (id: string, status: "open" | "resolved") => {
    const response = await apiRequest<UpdateBugReportStatusResponse>(
      `/bug-reports/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );

    await mutate(
      (key: unknown) =>
        typeof key === "string" && key.startsWith(buildApiUrl("/bug-reports/")),
      undefined,
      { revalidate: true },
    );

    return response;
  };
}
