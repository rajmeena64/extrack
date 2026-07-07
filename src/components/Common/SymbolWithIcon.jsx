import React, { useMemo, useState } from "react";

/* =======================
   HELPERS
======================= */
const getCapitalLetters = (str) =>
  String(str || "")
    .toUpperCase()
    .match(/[A-Z0-9]/g)
    ?.join("") || "";

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
   STABLECOINS
======================= */
const STABLES = ["USDT", "USDC"];
const QUOTE_ASSETS = ["USDT", "USDC", "USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];

const getIconLookupCodes = (asset) => {
  const normalized = getCapitalLetters(asset);
  const withoutMultiplier = normalized.replace(/^\d+/, "");

  return [...new Set([normalized, withoutMultiplier].filter(Boolean))];
};

const getAssetIconPaths = (asset) =>
  getIconLookupCodes(asset).flatMap((code) => {
    const lowerCode = code.toLowerCase();

    return [
      `/assets/crypto/color/${lowerCode}.svg`,
      `/assets/flags/4x3/${lowerCode}.svg`,
    ];
  });

const getPairParts = (capitalOnly) => {
  for (const quoteAsset of QUOTE_ASSETS) {
    if (capitalOnly.length > quoteAsset.length && capitalOnly.endsWith(quoteAsset)) {
      return {
        base: capitalOnly.slice(0, -quoteAsset.length),
        quote: quoteAsset,
      };
    }

    if (STABLES.includes(quoteAsset) && capitalOnly.length > quoteAsset.length && capitalOnly.startsWith(quoteAsset)) {
      return {
        base: quoteAsset,
        quote: capitalOnly.slice(quoteAsset.length),
      };
    }
  }

  if (capitalOnly.length === 6) {
    return {
      base: capitalOnly.slice(0, 3),
      quote: capitalOnly.slice(3),
    };
  }

  return null;
};

function TokenIcon({ asset, paths, style, onResolved }) {
  const [pathIndex, setPathIndex] = useState(0);
  const src = paths[pathIndex];

  if (!src) {
    onResolved?.(asset, false);
    return null;
  }

  return (
    <img
      src={src}
      alt={asset}
      style={style}
      onLoad={() => onResolved?.(asset, true)}
      onError={() => {
        const nextIndex = pathIndex + 1;

        if (nextIndex >= paths.length) {
          onResolved?.(asset, false);
          return;
        }

        setPathIndex(nextIndex);
      }}
    />
  );
}

function PairIcon({ base, quote, iconSize, pairFlagStyle }) {
  const [baseHasIcon, setBaseHasIcon] = useState(null);
  const [quoteHasIcon, setQuoteHasIcon] = useState(null);
  const basePaths = useMemo(() => getAssetIconPaths(base), [base]);
  const quotePaths = useMemo(() => getAssetIconPaths(quote), [quote]);

  if (baseHasIcon === false || quoteHasIcon === false) {
    return null;
  }

  const handleResolved = (asset, hasIcon) => {
    if (asset === base) setBaseHasIcon(hasIcon);
    if (asset === quote) setQuoteHasIcon(hasIcon);
  };

  return (
    <div style={{ position: "relative", width: iconSize, height: iconSize }}>
      <TokenIcon
        asset={base}
        paths={basePaths}
        style={{
          ...pairFlagStyle,
          left: 0,
          top: iconSize / 4,
          zIndex: 2,
        }}
        onResolved={handleResolved}
      />

      <TokenIcon
        asset={quote}
        paths={quotePaths}
        style={{
          ...pairFlagStyle,
          left: iconSize / 3,
          top: 0,
          zIndex: 1,
        }}
        onResolved={handleResolved}
      />
    </div>
  );
}

/* =======================
   COMPONENT
======================= */
function SymbolWithIcon({ symbol, size = "md", showLabel = true }) {
  const iconSize = SIZE_MAP[size] || 18;
  const pairSize = Math.floor(iconSize * 0.75);

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
     CASE 1 : FIXED ICON
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

        {showLabel ? <span style={{ fontSize: 10 }}>{uiSymbol}</span> : null}
      </div>
    );
  }

  /* =======================
     CASE 2 : DATA-DRIVEN PAIR
  ======================= */
  const pairParts = getPairParts(capitalOnly);

  if (pairParts) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PairIcon
          key={`${pairParts.base}-${pairParts.quote}`}
          base={pairParts.base}
          quote={pairParts.quote}
          iconSize={iconSize}
          pairFlagStyle={pairFlagStyle}
        />

        {showLabel ? <span style={{ fontSize: 10 }}>{uiSymbol}</span> : null}
      </div>
    );
  }

  /* =======================
     FALLBACK
  ======================= */
  return showLabel ? <span>{uiSymbol}</span> : null;
}

export default SymbolWithIcon;
