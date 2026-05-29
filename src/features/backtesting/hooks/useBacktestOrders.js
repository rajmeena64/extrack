import { useMemo } from 'react';
import {
  calculatePositionSize,
  calculateRR,
  calculateReward,
  calculateRisk,
  validateOrder,
} from '../engine/riskCalculator';

export function useBacktestOrders({
  balance,
  selectedOrderSide,
  entryPrice,
  stopLoss,
  takeProfit,
  riskAmount,
  riskPercent,
  customRiskAmount,
}) {
  return useMemo(() => {
    const effectiveRiskAmount = Number(customRiskAmount || riskAmount || 0);
    const positionSize = calculatePositionSize(entryPrice, stopLoss, effectiveRiskAmount);
    const calculatedRisk = calculateRisk(entryPrice, stopLoss, positionSize, selectedOrderSide);
    const rewardAmount = calculateReward(entryPrice, takeProfit, positionSize, selectedOrderSide);
    const rrRatio = calculateRR(entryPrice, stopLoss, takeProfit, selectedOrderSide);
    const errors = validateOrder({
      side: selectedOrderSide,
      balance,
      entryPrice,
      stopLoss,
      takeProfit,
      quantity: positionSize,
      riskAmount: effectiveRiskAmount,
    });

    return {
      riskPercent,
      riskAmount: effectiveRiskAmount,
      positionSize,
      calculatedRisk,
      rewardAmount,
      rrRatio,
      errors,
    };
  }, [balance, customRiskAmount, entryPrice, riskAmount, riskPercent, selectedOrderSide, stopLoss, takeProfit]);
}
