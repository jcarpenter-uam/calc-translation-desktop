import { useEffect } from "react";

export function usePendingZoomLink(t) {
  useEffect(() => {
    const checkPendingZoomLink = async () => {
      const needsLink = sessionStorage.getItem("zoom_link_pending");

      if (needsLink === "true") {
        try {
          console.log("Found pending Zoom link, attempting to link account...");
          alert(t("finishing_zoom_setup"));

          const response = await window.electron.linkPendingZoom();

          if (response.status !== "ok") {
            throw new Error(response.message || "Failed to link Zoom account.");
          }

          console.log("Zoom account linked successfully!");
          alert(t("zoom_linked_success"));
        } catch (error) {
          console.error("Zoom link error:", error);
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
