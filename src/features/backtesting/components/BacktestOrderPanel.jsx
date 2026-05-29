import React, { useMemo, useState } from 'react';
import { calculatePositionSize, calculateRR, calculateReward, calculateRisk, validateOrder } from '../engine/riskCalculator';

const RISK_OPTIONS = [0.5, 1, 2, 3, 5];
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function BacktestOrderPanel({
  state,
  currentCandle,
  onFieldChange,
  onPlaceOrder,
  onJournalTrade,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [balanceMode, setBalanceMode] = useState('current');
  const [targetEnabled, setTargetEnabled] = useState(true);
  const [stopEnabled, setStopEnabled] = useState(true);
  const [autoBreakeven, setAutoBreakeven] = useState(false);
  const [rrInputMode, setRrInputMode] = useState('price');

  const marketPrice = currentCandle?.close || state.entryPrice || 0;
  const effectiveBalance = balanceMode === 'initial' ? state.initialBalance : state.balance;
  const stopLoss = stopEnabled ? numberValue(state.stopLoss) : 0;
  const takeProfit = targetEnabled ? numberValue(state.takeProfit) : 0;

  const calculations = useMemo(() => {
    const riskAmount = numberValue(state.riskAmount);
    const quantity = calculatePositionSize(marketPrice, stopLoss, riskAmount);
    return {
      quantity,
      riskAmount: calculateRisk(marketPrice, stopLoss, quantity, state.selectedOrderSide),
      rewardAmount: calculateReward(marketPrice, takeProfit, quantity, state.selectedOrderSide),
      rrRatio: calculateRR(marketPrice, stopLoss, takeProfit, state.selectedOrderSide),
      errors: validateOrder({
        side: state.selectedOrderSide,
        balance: effectiveBalance,
        entryPrice: marketPrice,
        stopLoss,
        takeProfit,
        quantity,
        riskAmount,
      }),
    };
  }, [effectiveBalance, marketPrice, state.riskAmount, state.selectedOrderSide, stopLoss, takeProfit]);

  const handleRiskPercent = (percent) => {
    onFieldChange('riskPercent', percent);
    onFieldChange('riskAmount', Number((effectiveBalance * (percent / 100)).toFixed(2)));
  };

  const handlePlaceOrder = (journal = false) => {
    if (calculations.errors.length) return;
    const order = {
      side: state.selectedOrderSide,
      orderType: state.orderType,
      entryPrice: marketPrice,
      stopLoss,
      takeProfit,
      quantity: calculations.quantity,
      riskAmount: numberValue(state.riskAmount),
    };
    onPlaceOrder(order);

    if (journal) {
      onJournalTrade({
        id: `draft-${Date.now()}`,
        status: 'open',
        symbol: state.symbol,
        side: state.selectedOrderSide,
        quantity: calculations.quantity,
        entryPrice: marketPrice,
        exitPrice: marketPrice,
        pnl: 0,
        entryIso: new Date((currentCandle?.time || Date.now() / 1000) * 1000).toISOString(),
        rMultiple: 0,
      });
    }
  };

  const sideLabel = state.selectedOrderSide === 'buy' ? 'Buy' : 'Sell';

  return (
    <aside className="backtest-order-panel">
      <div className="backtest-panel-heading">
        <span>Place Order</span>
        <strong>{state.symbol}</strong>
      </div>

      <div className="backtest-side-toggle">
        <button type="button" className={state.selectedOrderSide === 'buy' ? 'is-buy is-active' : 'is-buy'} onClick={() => onFieldChange('selectedOrderSide', 'buy')}>BUY</button>
        <button type="button" className={state.selectedOrderSide === 'sell' ? 'is-sell is-active' : 'is-sell'} onClick={() => onFieldChange('selectedOrderSide', 'sell')}>SELL</button>
      </div>

      <div className="backtest-segmented">
        {['market', 'limit', 'stop'].map((type) => (
          <button key={type} type="button" className={state.orderType === type ? 'is-active' : ''} onClick={() => onFieldChange('orderType', type)}>{type}</button>
        ))}
      </div>

      <label className="backtest-toggle-row">
        <span>Advanced order</span>
        <input type="checkbox" checked={advancedOpen} onChange={(event) => setAdvancedOpen(event.target.checked)} />
      </label>

      <div className="backtest-segmented backtest-segmented--wide">
        <button type="button" className={balanceMode === 'current' ? 'is-active' : ''} onClick={() => setBalanceMode('current')}>Current balance</button>
        <button type="button" className={balanceMode === 'initial' ? 'is-active' : ''} onClick={() => setBalanceMode('initial')}>Initial balance</button>
      </div>

      <div className="backtest-risk-buttons">
        {RISK_OPTIONS.map((percent) => (
          <button key={percent} type="button" className={state.riskPercent === percent ? 'is-active' : ''} onClick={() => handleRiskPercent(percent)}>
            {percent}%
          </button>
        ))}
      </div>

      <div className="backtest-form-grid">
        <label><span>Custom max risk %</span><input type="number" min="0" step="0.1" value={state.riskPercent} onChange={(event) => handleRiskPercent(Number(event.target.value))} /></label>
        <label><span>Max risk amount</span><input type="number" min="0" step="1" value={state.riskAmount} onChange={(event) => onFieldChange('riskAmount', Number(event.target.value))} /></label>
        <label><span>Position size</span><input readOnly value={calculations.quantity} /></label>
        <label><span>Market price</span><input readOnly value={marketPrice.toFixed(5)} /></label>
      </div>

      {advancedOpen && (
        <>
          <label className="backtest-check-input">
            <input type="checkbox" checked={targetEnabled} onChange={(event) => setTargetEnabled(event.target.checked)} />
            <span>Profit target</span>
            <input type="number" value={state.takeProfit || ''} onChange={(event) => onFieldChange('takeProfit', Number(event.target.value))} />
          </label>

          <label className="backtest-check-input">
            <input type="checkbox" checked={stopEnabled} onChange={(event) => setStopEnabled(event.target.checked)} />
            <span>Stop loss</span>
            <input type="number" value={state.stopLoss || ''} onChange={(event) => onFieldChange('stopLoss', Number(event.target.value))} />
          </label>

          <label className="backtest-toggle-row">
            <span>Auto breakeven</span>
            <input type="checkbox" checked={autoBreakeven} onChange={(event) => setAutoBreakeven(event.target.checked)} />
          </label>

          <div className="backtest-segmented">
            {['price', 'reward', 'R multiple'].map((mode) => (
              <button key={mode} type="button" className={rrInputMode === mode ? 'is-active' : ''} onClick={() => setRrInputMode(mode)}>{mode}</button>
            ))}
          </div>
        </>
      )}

      <dl className="backtest-calcs">
        <div><dt>Reward amount</dt><dd className="is-positive">{currency.format(calculations.rewardAmount)}</dd></div>
        <div><dt>Risk amount</dt><dd className="is-negative">{currency.format(calculations.riskAmount)}</dd></div>
        <div><dt>Total balance after trade</dt><dd>{currency.format(effectiveBalance + calculations.rewardAmount)}</dd></div>
        <div><dt>Position size</dt><dd>{calculations.quantity}</dd></div>
        <div><dt>R:R ratio</dt><dd>{calculations.rrRatio}:1</dd></div>
      </dl>

      {calculations.errors.length > 0 && (
        <div className="backtest-order-errors">{calculations.errors[0]}</div>
      )}

      <div className="backtest-order-actions">
        <button type="button" className={state.selectedOrderSide === 'buy' ? 'is-buy' : 'is-sell'} onClick={() => handlePlaceOrder(false)}>
          {sideLabel} {calculations.quantity} {state.symbol}
        </button>
        <button type="button" onClick={() => handlePlaceOrder(true)}>
          {sideLabel} and Journal
        </button>
      </div>
    </aside>
  );
}

export default BacktestOrderPanel;
