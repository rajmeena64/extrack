import React, { useState, useMemo } from "react";

function Heatmap({ darkMode }) {
  const [active, setActive] = useState("stocks");

  const theme = darkMode ? "dark" : "light";

  // 🔥 iframe URLs theme-aware
  const srcMap = useMemo(
    () => ({
      stocks: `https://www.tradingview.com/embed-widget/stock-heatmap/?locale=en&colorTheme=${theme}`,
      forex: `https://www.tradingview.com/embed-widget/forex-heat-map/?locale=en&colorTheme=${theme}`,
      crypto: `https://www.tradingview.com/embed-widget/crypto-heatmap/?locale=en&colorTheme=${theme}`,
    }),
    [theme]
  );

  return (
    <div className="heatmap-container">

      {/* HEADER / TABS */}
      <div className="heatmap-header">
        <button
          className={`heatmap-tab ${active === "stocks" ? "active" : ""}`}
          onClick={() => setActive("stocks")}
        >
          Stocks
        </button>

        <button
          className={`heatmap-tab ${active === "forex" ? "active" : ""}`}
          onClick={() => setActive("forex")}
        >
          Forex
        </button>

        <button
          className={`heatmap-tab ${active === "crypto" ? "active" : ""}`}
          onClick={() => setActive("crypto")}
        >
          Crypto
        </button>
      </div>

      {/* BODY */}
      <div className="heatmap-body">
        <iframe
          key={`${active}-${theme}`} // 🔥 reload on tab OR theme change
          title="Heatmap"
          src={srcMap[active]}
          frameBorder="0"
          scrolling="no"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>

    </div>
  );
}

export default Heatmap;
