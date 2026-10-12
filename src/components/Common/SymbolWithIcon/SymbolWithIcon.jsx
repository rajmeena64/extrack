import React, { useEffect, useState } from "react";
import { CRYPTO_ICONS, FLAG_ICONS } from "./availableIcons";
import { useInstrument } from "@/hooks/useInstruments";

const SIZE_MAP = { sm: 14, md: 18, lg: 24 };
const LABEL_SIZE_MAP = { sm: 9, md: 10, lg: 12 };
const getFallbackLetters = (symbol) =>
  String(symbol || "").toUpperCase().match(/[A-Z0-9]/g)?.join("").slice(0, 2) || "?";

const getAssetIconPath = (asset, inst) => {
  if (!asset) return null;
  const k = String(asset).trim().toLowerCase();
  if (inst?.assetClass === "metal" || (inst?.category === "cfd" && inst?.assetClass !== "crypto")) {
    return `/assets/commodities/${inst?.icon?.toLowerCase() || k}.svg`;
  }
  if (inst?.category === "forex" || FLAG_ICONS.has(k)) return `/assets/flags/4x3/${k}.svg`;
  if (CRYPTO_ICONS.has(k)) return `/assets/crypto/color/${k}.svg`;
  return null;
};

function SymbolFallbackIcon({ symbol, iconSize }) {
  return (
    <span
      aria-hidden="true"
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #1f2937, #475569)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "50%",
        color: "#ffffff",
        display: "inline-flex",
        flexShrink: 0,
        fontSize: Math.max(9, Math.floor(iconSize * 0.42)),
        fontWeight: 800,
        height: iconSize,
        justifyContent: "center",
        letterSpacing: -0.5,
        lineHeight: 1,
        minWidth: iconSize,
        textTransform: "uppercase",
        width: iconSize,
      }}
    >
      {getFallbackLetters(symbol)}
    </span>
  );
}

function SymbolWithIcon({ symbol, size = "md", showLabel = true, preferAssetIcon = false }) {
  const inst = useInstrument(symbol);
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [symbol]);

  const iconSize = SIZE_MAP[size] || 18;
  const labelSize = LABEL_SIZE_MAP[size] || 10;
  const pairSize = Math.floor(iconSize * 0.75);

  const baseSrc = getAssetIconPath(inst?.baseAsset, inst);
  const quoteSrc = getAssetIconPath(inst?.quoteAsset, inst);
  const isPair = !preferAssetIcon && Boolean(baseSrc && quoteSrc);
  const singleSrc = isPair ? null : (baseSrc || getAssetIconPath(inst?.icon, inst) || getAssetIconPath(symbol, inst));

  const renderIcon = () => {
    if (hasError) return <SymbolFallbackIcon symbol={symbol} iconSize={iconSize} />;
    if (isPair) {
      return (
        <div style={{ position: "relative", width: iconSize, height: iconSize, flexShrink: 0 }}>
          <img
            src={baseSrc}
            alt={inst.baseAsset}
            onError={() => setHasError(true)}
            style={{ width: pairSize, height: pairSize, borderRadius: "50%", position: "absolute", left: 0, top: iconSize / 4, zIndex: 2, objectFit: "cover" }}
          />
          <img
            src={quoteSrc}
            alt={inst.quoteAsset}
            onError={() => setHasError(true)}
            style={{ width: pairSize, height: pairSize, borderRadius: "50%", position: "absolute", left: iconSize / 3, top: 0, zIndex: 1, objectFit: "cover" }}
          />
        </div>
      );
    }
    if (singleSrc) {
      return (
        <img
          src={singleSrc}
          alt={symbol}
          onError={() => setHasError(true)}
          style={{ width: iconSize, height: iconSize, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      );
    }
    return <SymbolFallbackIcon symbol={symbol} iconSize={iconSize} />;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {renderIcon()}
      {showLabel ? <span style={{ fontSize: labelSize }}>{symbol}</span> : null}
    </div>
  );
}

export default SymbolWithIcon;
