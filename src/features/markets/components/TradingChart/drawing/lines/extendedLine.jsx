import React from "react";

export const extendedLineTool = {
  id: "ExtendedLine",
  label: "Extended Line",
  category: "lines",
  pointsNeeded: 2,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="2" y1="22" x2="22" y2="2" />
      <circle cx="8" cy="16" r="2" fill="currentColor" />
      <circle cx="16" cy="8" r="2" fill="currentColor" />
    </svg>
  ),
};
