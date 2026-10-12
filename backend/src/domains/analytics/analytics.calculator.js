function computeStats(trades) {
  let totalPnL = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  const dayMap = new Map();

  trades.forEach((t) => {
    const pnl = Number(t.pnl || 0);
    totalPnL += pnl;
    if (pnl > 0) {
      winningTrades += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losingTrades += 1;
      grossLoss += Math.abs(pnl);
    }
    if (t.date) {
      dayMap.set(t.date, (dayMap.get(t.date) || 0) + pnl);
    }
  });

  let winningDays = 0;
  let losingDays = 0;
  dayMap.forEach((pnl) => {
    if (pnl > 0) winningDays += 1;
    else if (pnl < 0) losingDays += 1;
  });

  const totalTrades = trades.length;
  const totalTradingDays = winningDays + losingDays;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const dayWinRate = totalTradingDays > 0 ? (winningDays / totalTradingDays) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

  return {
    totalPnL: Number(totalPnL.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    winningTrades,
    losingTrades,
    totalTrades,
    winningDays,
    losingDays,
    totalTradingDays,
    dayWinRate: Number(dayWinRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    avgPnL: Number(avgPnL.toFixed(2)),
    dayMap
  };
}

function computeRadar(trades) {
  if (!trades.length) {
    return { win: 0, profit: 0, avg: 0, recovery: 0, drawdown: 0, consistency: 0, overallScore: 0 };
  }
  const pnls = trades.map((t) => Number(t.pnl || 0));
  const winners = pnls.filter((p) => p > 0);
  const losers = pnls.filter((p) => p < 0);
  const winRate = (winners.length / trades.length) * 100;
  const grossProfit = winners.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(losers.reduce((s, p) => s + p, 0));
  const rawPF = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 0;
  const profitFactor = Math.min((rawPF / 3) * 100, 100);

  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 1;
  const avgRatio = Math.min(((avgWin / (avgLoss || 1)) / 2) * 100, 100);

  const netPnL = pnls.reduce((s, p) => s + p, 0);
  let peak = 0;
  let maxDD = 0;
  let running = 0;
  for (const p of pnls) {
    running += p;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  const rawRF = maxDD > 0 ? netPnL / maxDD : netPnL > 0 ? 3 : 0;
  const recovery = Math.min(Math.max((rawRF / 3) * 100, 0), 100);
  const drawdown = Math.max(100 - (peak > 0 ? (maxDD / peak) * 100 : 0), 0);

  const win = Math.round(winRate);
  const profit = Math.round(profitFactor);
  const avg = Math.round(avgRatio);
  const recoveryScore = Math.round(recovery);
  const drawdownScore = Math.round(drawdown);
  const consistencyScore = win;
  const overallScore = Math.round(win * 0.2 + profit * 0.25 + avg * 0.15 + recoveryScore * 0.15 + drawdownScore * 0.15 + consistencyScore * 0.1);

  return { win, profit, avg, recovery: recoveryScore, drawdown: drawdownScore, consistency: consistencyScore, overallScore };
}

module.exports = {
  computeStats,
  computeRadar
};
