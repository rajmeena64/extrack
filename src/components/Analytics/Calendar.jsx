import React, { useMemo } from "react";

function Calendar({ darkMode }) {
  const src = useMemo(() => {
    const theme = darkMode ? "dark" : "light";

    return `https://www.tradingview.com/embed-widget/events/?locale=en&importanceFilter=0,1,2&currencyFilter=USD,EUR,GBP,JPY,INR&colorTheme=${theme}`;
  }, [darkMode]);

  return (
    <div className="analytics-panel">
      <iframe
        key={src} // 🔥 force reload when theme changes
        title="TradingView Economic Calendar"
        src={src}
        frameBorder="0"
        scrolling="no"
        allowTransparency="true"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

export default Calendar;
