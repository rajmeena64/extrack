import React from "react";

export const horizontalLineTool = {
  id: "HorizontalLine",
  label: "Horizontal Line",
  category: "lines",
  pointsNeeded: 1,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="2" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
};
