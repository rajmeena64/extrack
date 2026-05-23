import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";

function NEWS() {
  const { darkMode } = useTheme();
  const src = useMemo(() => {
    const theme = darkMode ? "dark" : "light";

    return `https://www.tradingview.com/embed-widget/events/?locale=en&importanceFilter=0,1,2&currencyFilter=USD,EUR,GBP,JPY,INR&colorTheme=${theme}`;
  }, [darkMode]);

  return (
    <div className="analytics-panel tradingview-calendar-widget-panel">
      <div className="tradingview-calendar-widget-host">
        <iframe
          key={src}
          title="TradingView Economic Calendar"
          src={src}
          frameBorder="0"
          scrolling="no"
        />
      </div>
    </div>
  );
}

export default NEWS;
