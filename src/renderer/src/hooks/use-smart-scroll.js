import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import log from "electron-log/renderer";

const SCROLL_PADDING_BOTTOM = 96;

/**
 * A custom React hook that provides "smart" auto-scrolling for a dynamic list of content.
 * It automatically scrolls to the bottom when new items are added, but only if the user is already
 * near the bottom. It also provides notifications to the user about the auto-scroll status.
 * * @param {Array} list - The dependency list that triggers scroll checks (e.g. transcripts).
 * @param {React.RefObject} lastElementRef - Ref to the last element in the list.
 * @param {any} extraDependency - Additional dependency to trigger scroll logic.
 * @param {React.RefObject} [scrollContainerRef] - Optional ref to the scrollable container element. If null, defaults to window.
 */
export function useSmartScroll(
  list,
  lastElementRef,
  extraDependency = null,
  scrollContainerRef = null,
) {
  const [notification, setNotification] = useState({
    message: "",
    visible: false,
  });
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const notificationTimeoutRef = useRef(null);
  const ignoreScrollEventsRef = useRef(false);
  const scrollCooldownTimer = useRef(null);

  const { t } = useTranslation();

  const showNotification = (message) => {
    log.info(`Showing notification: "${message}"`);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification({ message, visible: true });
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification({ message: "", visible: false });
    }, 3000);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (ignoreScrollEventsRef.current) {
        return;
      }

      let isAtTarget = false;
      const container = scrollContainerRef?.current;

      if (container) {
        if (lastElementRef.current) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = lastElementRef.current.getBoundingClientRect();
          isAtTarget = elementRect.bottom <= containerRect.bottom + 20;
        } else {
          const { scrollTop, scrollHeight, clientHeight } = container;
          isAtTarget = scrollHeight - scrollTop <= clientHeight + 20;
        }
      } else {
        const scrollElement = window.document.documentElement;
        const { clientHeight } = scrollElement;

        if (lastElementRef.current) {
          const { bottom } = lastElementRef.current.getBoundingClientRect();
          isAtTarget = bottom <= clientHeight + 20;
        } else {
          const { scrollTop, scrollHeight } = scrollElement;
          isAtTarget = scrollHeight - scrollTop <= clientHeight + 1;
        }
      }

      if (isAtTarget && !isAutoScrollEnabled) {
        log.info("User scrolled to bottom. Enabling auto-scroll.");
        setIsAutoScrollEnabled(true);
        const message = t("auto_scroll_on");
        showNotification(message);
      } else if (!isAtTarget && isAutoScrollEnabled) {
        log.info("User scrolled up. Disabling auto-scroll.");
        setIsAutoScrollEnabled(false);
        const message = t("auto_scroll_off");
        showNotification(message);
      }
    };

    const target = scrollContainerRef?.current || window;
    target.addEventListener("scroll", handleScroll, { passive: true });

    return () => target.removeEventListener("scroll", handleScroll);
  }, [isAutoScrollEnabled, t, lastElementRef, scrollContainerRef]);

  useLayoutEffect(() => {
    if (isAutoScrollEnabled) {
      log.debug("Auto-scrolling to bottom.");

      const container = scrollContainerRef?.current;

      if (container) {
        if (lastElementRef.current) {
          const elementRect = lastElementRef.current.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset = elementRect.bottom - containerRect.bottom;

          container.scrollBy({
            top: offset + SCROLL_PADDING_BOTTOM,
            behavior: "auto",
          });
        } else {
          ignoreScrollEventsRef.current = true;
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "auto",
          });
        }
      } else {
        if (lastElementRef.current) {
          const { bottom } = lastElementRef.current.getBoundingClientRect();
          const targetScrollY =
            window.scrollY +
            bottom -
            window.innerHeight +
            SCROLL_PADDING_BOTTOM;

          window.scrollTo({
            top: targetScrollY,
            behavior: "auto",
          });
        } else {
          ignoreScrollEventsRef.current = true;
          window.scrollTo({
            top: window.document.documentElement.scrollHeight,
            behavior: "auto",
          });
        }
      }

      if (scrollCooldownTimer.current) {
        clearTimeout(scrollCooldownTimer.current);
      }
      scrollCooldownTimer.current = setTimeout(() => {
        ignoreScrollEventsRef.current = false;
      }, 100);
    }
  }, [
    list,
    lastElementRef,
    isAutoScrollEnabled,
    extraDependency,
    scrollContainerRef,
  ]);

  return notification;
}
