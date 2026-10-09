import React from "react";
import { lineTools } from "./lines";
import { fibonacciTools } from "./fibonacci";
import { shapeTools } from "./shapes";
import { predictionMeasurementTools } from "./prediction_measurement";
import { textTools } from "./text";
import { patternTools } from "./patterns";

export const cursorTool = {
  id: "cursor",
  label: "Cursor",
  category: "cursor",
  pointsNeeded: 0,
  icon: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 3 7 18 3-7 7-3L3 3z" />
    </svg>
  ),
};

export const DRAWING_CATEGORIES = [
  { id: "lines", label: "Lines", tools: lineTools },
  { id: "fibonacci", label: "Gann and Fibonacci", tools: fibonacciTools },
  { id: "shapes", label: "Geometric Shapes", tools: shapeTools },
  { id: "prediction_measurement", label: "Prediction and Measurement", tools: predictionMeasurementTools },
  { id: "text", label: "Text", tools: textTools },
  { id: "patterns", label: "Patterns", tools: patternTools },
];

export const ALL_DRAWING_TOOLS = [
  cursorTool,
  ...lineTools,
  ...fibonacciTools,
  ...shapeTools,
  ...predictionMeasurementTools,
];
