import { priceRangeTool } from "./priceRange";
import { dateRangeTool } from "./dateRange";
import { longPositionTool } from "./longPosition";
import { shortPositionTool } from "./shortPosition";

export const predictionMeasurementTools = [
  longPositionTool,
  shortPositionTool,
  priceRangeTool,
  dateRangeTool,
];
