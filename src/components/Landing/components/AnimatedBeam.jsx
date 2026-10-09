import React, { useId, useState, useEffect } from 'react';

export function AnimatedBeam({
  className = "",
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 4,
  delay = 0,
  pathColor = "rgba(255,255,255,0.08)",
  pathWidth = 2,
  pathOpacity = 0.3,
  gradientStartColor = "#2563eb",
  gradientStopColor = "#38bdf8",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) {
  const id = useId().replace(/:/g, "_");
  const [d, setD] = useState("");
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      if (!containerRef.current || !fromRef.current || !toRef.current) return;
      const c = containerRef.current.getBoundingClientRect();
      const a = fromRef.current.getBoundingClientRect();
      const b = toRef.current.getBoundingClientRect();
      setDim({ w: c.width, h: c.height });
      const sx = a.left - c.left + a.width / 2 + startXOffset;
      const sy = a.top - c.top + a.height / 2 + startYOffset;
      const ex = b.left - c.left + b.width / 2 + endXOffset;
      const ey = b.top - c.top + b.height / 2 + endYOffset;
      const cy = sy - curvature;
      setD(`M ${sx},${sy} Q ${(sx + ex) / 2},${cy} ${ex},${ey}`);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  if (!d || !dim.w || !dim.h) return null;

  const x1Vals = reverse ? "100%;-10%" : "-10%;100%";
  const x2Vals = reverse ? "110%;0%" : "0%;110%";

  return (
    <svg
      fill="none"
      width={dim.w}
      height={dim.h}
      viewBox={`0 0 ${dim.w} ${dim.h}`}
      className={`pointer-events-none absolute left-0 top-0 h-full w-full stroke-2 ${className}`}
    >
      <path d={d} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      <path d={d} stroke={`url(#${id})`} strokeWidth={pathWidth} strokeLinecap="round" />
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="0%" y2="0%">
          <animate attributeName="x1" values={x1Vals} dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`} />
          <animate attributeName="x2" values={x2Vals} dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`} />
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="50%" stopColor={gradientStopColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default AnimatedBeam;
