import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

function Heatmap() {
  const [active, setActive] = useState("stocks");
  const bodyRef = useRef(null);
  const { darkMode } = useTheme();
  const theme = darkMode ? "dark" : "light";

  const srcMap = useMemo(
    () => ({
      stocks: `https://www.tradingview.com/embed-widget/stock-heatmap/?locale=en&colorTheme=${theme}`,
      forex: `https://www.tradingview.com/embed-widget/forex-heat-map/?locale=en&colorTheme=${theme}&isTransparent=false&backgroundColor=${theme === "dark" ? "2a2e39" : "ffffff"}`,
      crypto: `https://www.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=en&colorTheme=${theme}`,
    }),
    [theme]
  );

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollLeft = 0;
    }
  }, [active, theme]);

  return (
    <div className="heatmap-container flex flex-col h-full flex-1 w-full bg-[var(--bg-primary)] min-h-0 border-t border-[var(--border-light)]">
      <div className="heatmap-header flex gap-2 py-2.5 px-3 shrink-0 border-b border-[var(--border-light)] bg-[var(--bg-secondary)] z-[5]">
        <button
          type="button"
          className={`heatmap-tab py-1.5 px-3.5 text-[13px] font-medium rounded-md border cursor-pointer transition-all duration-200 ${
            active === "stocks"
              ? "active bg-[var(--bg-hover)] text-[var(--accent-ink)] border-[color-mix(in_srgb,var(--accent-ink)_18%,transparent)]"
              : "border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          }`}
          onClick={() => setActive("stocks")}
        >
          Stocks
        </button>

        <button
          type="button"
          className={`heatmap-tab py-1.5 px-3.5 text-[13px] font-medium rounded-md border cursor-pointer transition-all duration-200 ${
            active === "forex"
              ? "active bg-[var(--bg-hover)] text-[var(--accent-ink)] border-[color-mix(in_srgb,var(--accent-ink)_18%,transparent)]"
              : "border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          }`}
          onClick={() => setActive("forex")}
        >
          Forex
        </button>

        <button
          type="button"
          className={`heatmap-tab py-1.5 px-3.5 text-[13px] font-medium rounded-md border cursor-pointer transition-all duration-200 ${
            active === "crypto"
              ? "active bg-[var(--bg-hover)] text-[var(--accent-ink)] border-[color-mix(in_srgb,var(--accent-ink)_18%,transparent)]"
              : "border-[var(--border-light)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
          }`}
          onClick={() => setActive("crypto")}
        >
          Crypto
        </button>
      </div>

      <div
        className={`heatmap-body relative flex-1 min-h-0 overflow-hidden ${
          active === "forex" ? "heatmap-body--forex bg-[#2a2e39] overflow-x-auto overflow-y-hidden [scrollbar-width:thin]" : ""
        }`}
        ref={bodyRef}
      >
        <iframe
          key={`${active}-${theme}`}
          className={`heatmap-iframe w-full h-full border-none block ${
            active === "forex" ? "heatmap-iframe--forex min-w-[520px] max-[380px]:min-w-[500px]" : ""
          }`}
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
