import { useEffect } from "react";
import log from "electron-log/renderer";

export function usePendingZoomLink(t) {
  useEffect(() => {
    const checkPendingZoomLink = async () => {
      const needsLink = sessionStorage.getItem("zoom_link_pending");

      if (needsLink === "true") {
        try {
          log.info("Zoom Link: Found pending Zoom link, attempting account link");
          alert(t("finishing_zoom_setup"));

          const response = await window.electron.linkPendingZoom();

          if (response.status !== "ok") {
            throw new Error(response.message || "Failed to link Zoom account.");
          }

          log.info("Zoom Link: Account linked successfully");
          alert(t("zoom_linked_success"));
        } catch (error) {
          log.error("Zoom Link: Account link failed", error.message || error);
          alert(t("zoom_link_failed", { error: error.message }));
        } finally {
          sessionStorage.removeItem("zoom_link_pending");
        }
      }
    };

    checkPendingZoomLink();
    // This flow should run once on page mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
