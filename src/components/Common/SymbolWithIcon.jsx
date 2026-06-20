import React, { useMemo, useState } from "react";
import binanceFutures from "../../../backend/instruments/data/crypto/binance_futures.json";

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

const BINANCE_FUTURES_BY_SYMBOL = binanceFutures.reduce((acc, instrument) => {
  const key = getCapitalLetters(instrument.symbol);

  if (key && instrument.baseAsset && instrument.quoteAsset) {
    acc[key] = {
      base: getCapitalLetters(instrument.baseAsset),
      quote: getCapitalLetters(instrument.quoteAsset),
    };
  }

  return acc;
}, {});

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
  if (BINANCE_FUTURES_BY_SYMBOL[capitalOnly]) {
    return BINANCE_FUTURES_BY_SYMBOL[capitalOnly];
  }

  for (const stable of STABLES) {
    if (capitalOnly.length > stable.length && capitalOnly.endsWith(stable)) {
      return {
        base: capitalOnly.slice(0, -stable.length),
        quote: stable,
      };
    }

    if (capitalOnly.length > stable.length && capitalOnly.startsWith(stable)) {
      return {
        base: stable,
        quote: capitalOnly.slice(stable.length),
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
