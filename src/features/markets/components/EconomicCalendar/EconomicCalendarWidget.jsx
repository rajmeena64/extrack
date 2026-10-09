import { memo, useEffect, useId, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

function EconomicCalendarWidget() {
  const container = useRef(null);
  const widgetId = useId().replace(/:/g, "");
  const widgetKey = useRef(`economicCalendarWidget-${widgetId}`);
  const { darkMode } = useTheme();

  useEffect(() => {
    const currentContainer = container.current;
    if (!currentContainer) return undefined;

    currentContainer.innerHTML = "";
    const containerId = `${widgetKey.current}-${darkMode ? "dark" : "light"}`;
    const widgetConfig = {
      containerId,
      width: "100%",
      height: "100%",
      mode: 2,
      fw: "react",
      theme: darkMode ? 1 : 0,
    };

    const widgetRoot = document.createElement("div");
    widgetRoot.id = containerId;
    widgetRoot.className = "w-full h-full min-h-0 bg-[var(--bg-card)] dark:bg-black";
    currentContainer.appendChild(widgetRoot);

    const copyright = document.createElement("div");
    copyright.className = "ecw-copyright";
    copyright.innerHTML = '<a href="https://www.metatrader.com/?utm_source=calendar.widget&utm_medium=link&utm_term=economic.calendar&utm_content=visit.mql5.calendar&utm_campaign=202.calendar.widget" rel="noopener nofollow" target="_blank">MetaTrader World Markets</a>';
    currentContainer.appendChild(copyright);

    if (typeof window.economicCalendar === "function") {
      window.economicCalendar(widgetConfig);
      return () => {
        currentContainer.innerHTML = "";
        if (Array.isArray(window.calendarCompletedID)) {
          window.calendarCompletedID = window.calendarCompletedID.filter((id) => id !== containerId);
        }
      };
    }

    const script = document.createElement("script");
    script.src = "https://www.tradays.com/c/js/widgets/calendar/widget.js?v=15";
    script.type = "text/javascript";
    script.async = true;
    script.dataset.type = "calendar-widget";
    script.innerHTML = JSON.stringify(widgetConfig);
    currentContainer.appendChild(script);

    return () => {
      currentContainer.innerHTML = "";
      if (Array.isArray(window.calendarCompletedID)) {
        window.calendarCompletedID = window.calendarCompletedID.filter((id) => id !== containerId);
      }
    };
  }, [darkMode]);

  return (
    <div className="analytics-panel economic-calendar-widget-panel relative w-full h-full flex-1 min-h-0 rounded-none overflow-hidden border border-[var(--border-light)] p-0 bg-[var(--bg-card)] after:content-none dark:bg-black dark:border-[#1f1f1f] dark:[&_iframe]:bg-black dark:[&_iframe]:[color-scheme:dark]">
      <div
        className="economic-calendar-widget-host relative w-full h-[calc(100%+46px)] min-h-0 overflow-hidden bg-[var(--bg-card)] dark:bg-black [&>div[id^='economicCalendarWidget']]:w-full [&>div[id^='economicCalendarWidget']]:h-full [&>div[id^='economicCalendarWidget']]:min-h-0 [&>div[id^='economicCalendarWidget']]:bg-[var(--bg-card)] dark:[&>div[id^='economicCalendarWidget']]:bg-black"
        ref={container}
      />
    </div>
  );
}

export default memo(EconomicCalendarWidget);
