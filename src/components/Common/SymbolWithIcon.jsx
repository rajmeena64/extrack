import React from "react";

/* =======================
   FIXED SYMBOL ICONS
======================= */
const fixedSymbolIcons = {
  XAUUSD: "/assets/commodities/xauusd.svg",
  XAGUSD: "/assets/commodities/xagusd.svg",
  BTCUSD: "/assets/crypto/color/btc.svg",
  ETHUSD: "/assets/crypto/color/eth.svg",
  US500: "/assets/commodities/us500.svg",
  NAS100: "/assets/commodities/usd.svg",
};

/* =======================
   SIZE MAP
======================= */
const SIZE_MAP = {
  sm: 14,
  md: 18,
  lg: 24,
};

/* =======================
   HELPERS
======================= */
const getCapitalLetters = (str) =>
  (str.match(/[A-Z0-9]/g) || []).join("");

/* =======================
   STABLECOINS
======================= */
const STABLES = ["USDT", "USDC"];

/* =======================
   COMPONENT
======================= */
function SymbolWithIcon({ symbol, size = "md" }) {
  const iconSize = SIZE_MAP[size] || 18;
  const pairSize = Math.floor(iconSize * 0.75); // 👈 smaller pair icons

  /* Base styles */
  const flagBaseStyle = {
    width: iconSize,
    height: iconSize,
    borderRadius: "50%",
    position: "absolute",
    objectFit: "cover",
  };

  const pairFlagStyle = {
    width: pairSize,
    height: pairSize,
    borderRadius: "50%",
    position: "absolute",
    objectFit: "cover",
  };

  const uiSymbol = symbol;
  const capitalOnly = getCapitalLetters(symbol);

  /* =======================
     CASE 1a : STABLECOIN START (7 length only)
  ======================= */
  for (const s of STABLES) {
    if (capitalOnly.length === 7 && capitalOnly.startsWith(s)) {
      const stable = s;
      const coin = capitalOnly.slice(4, 7); // fixed 3 letters

      const stableIcon = `/assets/crypto/color/${stable.toLowerCase()}.svg`;

      const coinPaths = [
        `/assets/flags/4x3/${coin.toLowerCase()}.svg`,
        `/assets/crypto/color/${coin.toLowerCase()}.svg`,
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative", width: iconSize, height: iconSize }}>
            {/* Stablecoin icon - LEFT position */}
            <img
              src={stableIcon}
              alt={stable}
              style={{
                ...pairFlagStyle,
                left: 0,
                top: iconSize / 4,
                zIndex: 2,
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />

            {/* Coin icon - RIGHT position */}
            {coinPaths.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={coin}
                style={{
                  ...pairFlagStyle,
                  left: iconSize / 3,
                  top: 0,
                  zIndex: 1,
                }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ))}
          </div>

          <span style={{ fontSize: 10, fontWeight: 500 }}>
            {uiSymbol}
          </span>
        </div>
      );
    }
  }

  /* =======================
     CASE 1b : STABLECOIN END (7 length only)
  ======================= */
  for (const s of STABLES) {
    if (capitalOnly.length === 7 && capitalOnly.endsWith(s)) {
      const stable = s;
      const coin = capitalOnly.slice(0, 3); // fixed 3 letters

      const stableIcon = `/assets/crypto/color/${stable.toLowerCase()}.svg`;

      const coinPaths = [
        `/assets/flags/4x3/${coin.toLowerCase()}.svg`,
        `/assets/crypto/color/${coin.toLowerCase()}.svg`,
      ];

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative", width: iconSize, height: iconSize }}>
            {/* Coin icon - LEFT position */}
            {coinPaths.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={coin}
                style={{
                  ...pairFlagStyle,
                  left: 0,
                  top: iconSize / 4,
                  zIndex: 2,
                }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ))}

            {/* Stablecoin icon - RIGHT position */}
            <img
              src={stableIcon}
              alt={stable}
              style={{
                ...pairFlagStyle,
                left: iconSize / 3,
                top: 0,
                zIndex: 1,
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>

          <span style={{ fontSize: 10, fontWeight: 500 }}>
            {uiSymbol}
          </span>
        </div>
      );
    }
  }

  /* =======================
     CASE 2 : FIXED ICON
  ======================= */
  if (fixedSymbolIcons[capitalOnly]) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <img
          src={fixedSymbolIcons[capitalOnly]}
          alt={capitalOnly}
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <span style={{ fontSize: 10 }}>{uiSymbol}</span>
      </div>
    );
  }

  /* =======================
     CASE 3 : NORMAL PAIR
  ======================= */
  if (capitalOnly.length === 6) {
    const base = capitalOnly.slice(0, 3).toLowerCase();
    const quote = capitalOnly.slice(3).toLowerCase();

    const basePaths = [
      `/assets/crypto/color/${base}.svg`,
      `/assets/flags/4x3/${base}.svg`,
    ];

    const quotePaths = [
      `/assets/crypto/color/${quote}.svg`,
      `/assets/flags/4x3/${quote}.svg`,
    ];

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative", width: iconSize, height: iconSize }}>
          {/* Base currency - LEFT position */}
          {basePaths.map((src, i) => (
            <img
              key={`b-${i}`}
              src={src}
              alt={base}
              style={{
                ...pairFlagStyle,
                left: 0,
                top: iconSize / 4,
                zIndex: 2,
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}

          {/* Quote currency - RIGHT position */}
          {quotePaths.map((src, i) => (
            <img
              key={`q-${i}`}
              src={src}
              alt={quote}
              style={{
                ...pairFlagStyle,
                left: iconSize / 3,
                top: 0,
                zIndex: 1,
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}
        </div>

        <span style={{ fontSize: 10 }}>{uiSymbol}</span>
      </div>
    );
  }

  /* =======================
     FALLBACK
  ======================= */
  return <span>{uiSymbol}</span>;
}

export default SymbolWithIcon;