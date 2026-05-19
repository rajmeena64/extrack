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

  return <div className="analytics-panel economic-calendar-widget-panel" ref={container} />;
}

export default memo(EconomicCalendarWidget);
