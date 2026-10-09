import React from "react";

export const parallelChannelTool = {
  id: "ParallelChannel",
  label: "Parallel Channel",
  category: "lines",
  pointsNeeded: 3,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="17" x2="17" y2="3" />
      <line x1="7" y1="21" x2="21" y2="7" />
      <line x1="5" y1="19" x2="19" y2="5" strokeDasharray="2 2" />
    </svg>
  ),
};
