import React, { useState } from "react";
import { AdminCard, AdminSection } from "./ui.jsx";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function BugReportsManagement({
  reports = [],
  loading,
  error,
  onRefresh,
  onViewLog,
  onSetResolved,
}) {
  const [activeLog, setActiveLog] = useState(null);
  const [activeError, setActiveError] = useState("");
  const [loadingLogId, setLoadingLogId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [statusUpdateId, setStatusUpdateId] = useState(null);

  const handleViewLog = async (report) => {
    setActiveError("");
    setLoadingLogId(report.id);
    try {
      const text = await onViewLog(report.id);
      setActiveLog({ report, text });
    } catch (viewError) {
      setActiveError(viewError.message || "Failed to load bug report log");
    } finally {
      setLoadingLogId(null);
    }
  };

  const handleRefresh = () => {
    onRefresh(statusFilter);
  };

  const handleFilterChange = (nextFilter) => {
    setStatusFilter(nextFilter);
    onRefresh(nextFilter);
  };

  const handleResolveToggle = async (report) => {
    setActiveError("");
    setStatusUpdateId(report.id);
    try {
      await onSetResolved(report.id, !report.is_resolved);
      await onRefresh(statusFilter);
      if (activeLog?.report.id === report.id) {
        setActiveLog((current) =>
          current
            ? { ...current, report: { ...current.report, is_resolved: !report.is_resolved } }
            : current,
        );
      }
    } catch (statusError) {
      setActiveError(statusError.message || "Failed to update bug report status");
    } finally {
      setStatusUpdateId(null);
    }
  };

  return (
    <AdminSection className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Bug Reports</h2>
        <div className="flex items-center gap-2">
          {[
            ["open", "Open"],
            ["resolved", "Resolved"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => handleFilterChange(value)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                statusFilter === value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          Failed to load bug reports: {error}
        </div>
      ) : (
        <AdminCard className="overflow-hidden bg-white dark:bg-zinc-900">
          <div className="max-h-[640px] overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                    Reporter
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                    Report
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                    Environment
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-sm text-center text-zinc-500 dark:text-zinc-400"
                    >
                      No bug reports yet.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="align-top">
                      <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {report.user_name || "Unknown"}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {report.user_email || report.user_id}
                        </div>
                        <div className="mt-2 text-zinc-500 dark:text-zinc-400">
                          {formatDate(report.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300 max-w-xl whitespace-pre-wrap break-words">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {report.title}
                        </div>
                        <div className="mt-2">{report.description}</div>
                        {report.steps_to_reproduce ? (
                          <div className="mt-2">
                            <span className="font-semibold">Steps:</span> {report.steps_to_reproduce}
                          </div>
                        ) : null}
                        {report.expected_behavior ? (
                          <div className="mt-2">
                            <span className="font-semibold">Expected:</span> {report.expected_behavior}
                          </div>
                        ) : null}
                        {report.actual_behavior ? (
                          <div className="mt-2">
                            <span className="font-semibold">Actual:</span> {report.actual_behavior}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words">
                        <div>Version: {report.app_version || "-"}</div>
                        <div className="mt-2">Platform: {report.platform || "-"}</div>
                        <div className="mt-2">Log attached: {report.has_log_file ? "Yes" : "No"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 font-medium ${
                            report.is_resolved
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {report.is_resolved ? "Resolved" : "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="flex flex-col items-start gap-2">
                          <button
                            onClick={() => handleViewLog(report)}
                            disabled={!report.has_log_file || loadingLogId === report.id}
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loadingLogId === report.id ? "Loading..." : "View log"}
                          </button>
                          <button
                            onClick={() => handleResolveToggle(report)}
                            disabled={statusUpdateId === report.id}
                            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {statusUpdateId === report.id
                              ? "Saving..."
                              : report.is_resolved
                                ? "Mark open"
                                : "Resolve"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      {activeError ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {activeError}
        </div>
      ) : null}

      {activeLog ? (
        <AdminCard className="overflow-hidden bg-zinc-950 border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {activeLog.report.title}
              </h3>
              <p className="text-xs text-zinc-400">
                Log attached to report #{activeLog.report.id}
              </p>
            </div>
            <button
              onClick={() => setActiveLog(null)}
              className="rounded-md border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all p-4 text-xs text-zinc-300">
            {activeLog.text}
          </pre>
        </AdminCard>
      ) : null}
    </AdminSection>
  );
}
