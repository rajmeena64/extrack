import React, { useState, useEffect, useRef } from "react";
import { Dropper, Plus, XClose } from "@untitledui/icons";

const DEFAULT_SAVED_COLORS = ["#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316", "#7F56D9", "#FFFFFF"];

function hsvToRgb(h, s, v) {
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = max === 0 ? 0 : d / max, v = max;
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
}

function hexToRgb(hex) {
  if (!hex) return [127, 86, 217];
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex.slice(0, 6), 16);
  if (Number.isNaN(num)) return [127, 86, 217];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function ColorPicker({ color = "#7F56D9", onChange, onClose, className = "" }) {
  const [activeTab, setActiveTab] = useState("solid");
  const [hue, setHue] = useState(260);
  const [sat, setSat] = useState(60);
  const [val, setVal] = useState(85);
  const [alpha, setAlpha] = useState(100);
  const [savedColors, setSavedColors] = useState(() => {
    try {
      const stored = localStorage.getItem("trading_saved_colors");
      return stored ? JSON.parse(stored) : DEFAULT_SAVED_COLORS;
    } catch {
      return DEFAULT_SAVED_COLORS;
    }
  });

  const satValRef = useRef(null);

  useEffect(() => {
    if (!color) return;
    const [r, g, b] = hexToRgb(color);
    const [h, s, v] = rgbToHsv(r, g, b);
    setHue(h);
    setSat(s);
    setVal(v);
  }, []);

  const [currentR, currentG, currentB] = hsvToRgb(hue, sat / 100, val / 100);
  const currentHex = rgbToHex(currentR, currentG, currentB);

  const notifyChange = (newHex, newAlpha = alpha) => {
    onChange?.(newHex, newAlpha / 100);
  };

  const handleSatValPointer = (e) => {
    const rect = satValRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const newSat = Math.round((x / rect.width) * 100);
    const newVal = Math.round((1 - y / rect.height) * 100);
    setSat(newSat);
    setVal(newVal);
    const [r, g, b] = hsvToRgb(hue, newSat / 100, newVal / 100);
    notifyChange(rgbToHex(r, g, b));
  };

  const onSatValDown = (e) => {
    handleSatValPointer(e);
    const onMove = (ev) => handleSatValPointer(ev);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleHueChange = (e) => {
    const h = Number(e.target.value);
    setHue(h);
    const [r, g, b] = hsvToRgb(h, sat / 100, val / 100);
    notifyChange(rgbToHex(r, g, b));
  };

  const handleAlphaChange = (e) => {
    const a = Number(e.target.value);
    setAlpha(a);
    notifyChange(currentHex, a);
  };

  const handleHexInput = (e) => {
    const valStr = e.target.value.trim();
    if (/^#?[0-9A-Fa-f]{6}$/.test(valStr)) {
      const formatted = valStr.startsWith("#") ? valStr.toUpperCase() : `#${valStr.toUpperCase()}`;
      const [r, g, b] = hexToRgb(formatted);
      const [h, s, v] = rgbToHsv(r, g, b);
      setHue(h);
      setSat(s);
      setVal(v);
      notifyChange(formatted);
    }
  };

  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res?.sRGBHex) {
          const hex = res.sRGBHex.toUpperCase();
          const [r, g, b] = hexToRgb(hex);
          const [h, s, v] = rgbToHsv(r, g, b);
          setHue(h);
          setSat(s);
          setVal(v);
          notifyChange(hex);
        }
      } catch {}
    }
  };

  const handleAddSaved = () => {
    if (!savedColors.includes(currentHex)) {
      const updated = [...savedColors, currentHex].slice(-16);
      setSavedColors(updated);
      try {
        localStorage.setItem("trading_saved_colors", JSON.stringify(updated));
      } catch {}
    }
  };

  return (
    <div className={`w-[270px] bg-[#16181e] border border-[#2a2e39] rounded-xl shadow-2xl p-3 select-none text-xs text-[#d1d4dc] font-sans ${className}`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-[#2a2e39]/80 pb-2 mb-2.5">
        <div className="flex items-center gap-3">
          {["solid", "gradient", "image"].map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`capitalize transition-colors font-medium ${activeTab === tab ? "text-white border-b-2 border-[#7F56D9] pb-0.5" : "text-[#787b86] hover:text-[#d1d4dc]"}`}>
              {tab}
            </button>
          ))}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors">
            <XClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div ref={satValRef} onPointerDown={onSatValDown} className="relative w-full h-36 rounded-lg overflow-hidden cursor-crosshair mb-3 touch-none" style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}>
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform" style={{ left: `${sat}%`, top: `${100 - val}%`, backgroundColor: currentHex }} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={handleEyeDropper} className="w-7 h-7 flex items-center justify-center rounded-md border border-[#2a2e39] text-[#787b86] hover:text-white hover:bg-[#2a2e39] transition-colors shrink-0" title="Pick color from screen">
          <Dropper className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 flex flex-col gap-2">
          <input type="range" min="0" max="360" value={hue} onChange={handleHueChange} className="w-full h-2.5 rounded-full appearance-none cursor-pointer outline-none" style={{ background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)" }} />
          <input type="range" min="0" max="100" value={alpha} onChange={handleAlphaChange} className="w-full h-2.5 rounded-full appearance-none cursor-pointer outline-none" style={{ background: `linear-gradient(to right, transparent, ${currentHex})` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 p-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg mb-3">
        <span className="text-[11px] text-[#787b86] px-1 font-medium">Hex</span>
        <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: currentHex, opacity: alpha / 100 }} />
        <input type="text" defaultValue={currentHex.replace("#", "")} key={currentHex} onBlur={handleHexInput} onKeyDown={(e) => e.key === "Enter" && handleHexInput(e)} className="flex-1 min-w-0 bg-transparent text-white font-mono text-[11px] outline-none px-1 uppercase" />
        <span className="text-[11px] text-[#787b86] font-mono px-1 border-l border-[#2a2e39]">{alpha}%</span>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] text-[#787b86] mb-1.5">
          <span>Saved</span>
          <button type="button" onClick={handleAddSaved} className="flex items-center gap-0.5 hover:text-white transition-colors">
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
          {savedColors.map((c, i) => (
            <button
              key={`${c}-${i}`}
              type="button"
              onClick={() => {
                const [r, g, b] = hexToRgb(c);
                const [h, s, v] = rgbToHsv(r, g, b);
                setHue(h); setSat(s); setVal(v);
                notifyChange(c);
              }}
              className={`w-4 h-4 rounded-full border transition-transform hover:scale-110 ${currentHex === c ? "ring-2 ring-[#7F56D9] scale-110" : "border-white/20"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ColorPicker;
