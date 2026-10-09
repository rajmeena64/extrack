import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

function NEWS() {
  const { darkMode } = useTheme();
  const src = useMemo(() => {
    const theme = darkMode ? "dark" : "light";

    return `https://www.tradingview.com/embed-widget/events/?locale=en&importanceFilter=0,1,2&currencyFilter=USD,EUR,GBP,JPY,INR&colorTheme=${theme}`;
  }, [darkMode]);

  return (
    <div className="economic-calendar-panel tradingview-calendar-widget-panel relative w-full h-full flex-1 min-h-0 rounded-none overflow-hidden border border-[var(--border-light)] p-0 bg-[var(--bg-card)] after:content-none dark:bg-black dark:border-[#1f1f1f]">
      <div className="tradingview-calendar-widget-host relative w-full h-[calc(100%+46px)] min-h-0 overflow-hidden bg-[var(--bg-card)] dark:bg-black">
        <iframe
          key={src}
          title="TradingView Economic Calendar"
          src={src}
          frameBorder="0"
          scrolling="no"
          className="w-full h-full border-0 block dark:bg-black [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>
    </div>
  );
}

export default NEWS;
