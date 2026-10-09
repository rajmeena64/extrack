import React from "react";

export const rectangleTool = {
  id: "Rectangle",
  label: "Rectangle",
  category: "shapes",
  pointsNeeded: 2,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
    </svg>
  ),
};
