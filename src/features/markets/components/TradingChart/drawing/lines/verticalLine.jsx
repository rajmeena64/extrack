import React from "react";

export const verticalLineTool = {
  id: "VerticalLine",
  label: "Vertical Line",
  category: "lines",
  pointsNeeded: 1,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="22" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
};
