import React from "react";

export const trendLineTool = {
  id: "TrendLine",
  label: "Trendline",
  category: "lines",
  pointsNeeded: 2,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="20" x2="20" y2="4" />
      <circle cx="4" cy="20" r="2" fill="currentColor" />
      <circle cx="20" cy="4" r="2" fill="currentColor" />
    </svg>
  ),
};
