import React, { useState } from "react";
import { FileArrowDown } from "@phosphor-icons/react/dist/csr/FileArrowDown";
import { SpinnerBall } from "@phosphor-icons/react/dist/csr/SpinnerBall";

const DownloadIcon = () => <FileArrowDown size={23} />;

const LoadingIcon = () => <SpinnerBall size={23} />;

/**
 * An icon-button component to download a .vtt transcript file.
 * Becomes green and enabled when isDownloadable is true.
 */
function DownloadVttButton({ integration, sessionId, token, isDownloadable }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (isLoading || !isDownloadable) return;

    setIsLoading(true);

    try {
      const response = await window.electron.downloadVtt({
        integration,
        sessionId,
        token,
      });

      if (response.status !== "ok") {
        throw new Error(response.message || "Download failed in main process");
      }

      const blob = new Blob([response.data], { type: "text/vtt" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;

      const timestamp = new Date().toISOString().split("T")[0];
      link.setAttribute(
        "download",
        `${integration}_${timestamp}_transcript.vtt`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Download Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const baseClasses =
    "p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  const activeClasses =
    "bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100 hover:bg-green-300 dark:hover:bg-green-600";

  const inactiveClasses =
    "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800";

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading || !isDownloadable}
      className={`${baseClasses} ${
        isDownloadable ? activeClasses : inactiveClasses
      }`}
      aria-label={
        isDownloadable
          ? "Download transcript"
          : "Download transcript (available after session)"
      }
      title={
        isDownloadable
          ? "Download Transcript"
          : "Transcript download will be available when the session ends."
      }
    >
      {isLoading ? <LoadingIcon /> : <DownloadIcon />}
    </button>
  );
}

export default DownloadVttButton;
