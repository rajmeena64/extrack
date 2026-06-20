import React, { useMemo, useState } from 'react';
import { EllipsisVertical, X } from '../../../icons/lucideIcons';
import { calculatePositionSize, calculateRR, calculateReward, calculateRisk, validateOrder } from '../engine/riskCalculator';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function BacktestOrderPanel({
  state,
  currentCandle,
  onClose,
  onFieldChange,
  onPlaceOrder,
  onJournalTrade,
}) {
  const [targetEnabled, setTargetEnabled] = useState(true);
  const [stopEnabled, setStopEnabled] = useState(true);

  const marketPrice = currentCandle?.close || state.entryPrice || 0;
  const effectiveBalance = state.balance;
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
  const oppositeSideLabel = state.selectedOrderSide === 'buy' ? 'Sell' : 'Buy';
  const displayPrice = marketPrice.toFixed(2);
  const orderTypeLabel = state.orderType === 'market' ? 'MKT' : state.orderType.toUpperCase();

  return (
    <aside className="backtest-order-panel">
      <div className="backtest-panel-heading">
        <div>
          <strong>{state.symbol}, Trading</strong>
        </div>
        <button className="backtest-panel-more" type="button" title="Order settings" aria-label="Order settings">
          <EllipsisVertical size={16} aria-hidden="true" />
        </button>
        <button className="backtest-panel-close" type="button" onClick={onClose} title="Hide order panel" aria-label="Hide order panel">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="backtest-ticket-tabs" role="tablist" aria-label="Order views">
        <button type="button" className="is-active">Order</button>
        <button type="button">DOM</button>
      </div>

      <div className="backtest-side-toggle">
        <button type="button" className={state.selectedOrderSide === 'sell' ? 'is-sell is-active' : 'is-sell'} onClick={() => onFieldChange('selectedOrderSide', 'sell')}>
          <span>Sell</span>
          <strong>{displayPrice}</strong>
        </button>
        <span className="backtest-ticket-spread">0.00</span>
        <button type="button" className={state.selectedOrderSide === 'buy' ? 'is-buy is-active' : 'is-buy'} onClick={() => onFieldChange('selectedOrderSide', 'buy')}>
          <span>Buy</span>
          <strong>{displayPrice}</strong>
        </button>
      </div>

      <div className="backtest-segmented">
        {['market', 'limit', 'stop'].map((type) => (
          <button key={type} type="button" className={state.orderType === type ? 'is-active' : ''} onClick={() => onFieldChange('orderType', type)}>{type}</button>
        ))}
      </div>

      <div className="backtest-form-grid">
        <label><span>Units</span><input type="number" min="0" step="1" value={state.riskAmount} onChange={(event) => onFieldChange('riskAmount', Number(event.target.value))} /></label>
      </div>

      <div className="backtest-advanced-ticket">
        <div className="backtest-protection-grid">
          <label className="backtest-protection-toggle">
            <input type="checkbox" checked={targetEnabled} onChange={(event) => setTargetEnabled(event.target.checked)} />
            <span>Take Profit</span>
          </label>
          <label className="backtest-protection-toggle">
            <input type="checkbox" checked={stopEnabled} onChange={(event) => setStopEnabled(event.target.checked)} />
            <span>Stop Loss</span>
          </label>

          <div className={targetEnabled ? 'backtest-protection-box' : 'backtest-protection-box is-disabled'}>
            <input type="number" min="0" step="0.1" value={state.riskPercent} onChange={(event) => handleRiskPercent(Number(event.target.value))} aria-label="Take profit ticks" />
            <input type="number" value={state.takeProfit || ''} onChange={(event) => onFieldChange('takeProfit', Number(event.target.value))} aria-label="Take profit price" />
            <input readOnly value={currency.format(calculations.rewardAmount)} aria-label="Take profit money" />
            <input readOnly value={calculations.rrRatio ? `${calculations.rrRatio}:1` : '0.00'} aria-label="Take profit ratio" />
          </div>

          <div className="backtest-protection-labels" aria-hidden="true">
            <span>Ticks</span>
            <span>Price</span>
            <span>Money</span>
            <span>%</span>
          </div>

          <div className={stopEnabled ? 'backtest-protection-box' : 'backtest-protection-box is-disabled'}>
            <input type="number" min="0" step="1" value={state.riskAmount} onChange={(event) => onFieldChange('riskAmount', Number(event.target.value))} aria-label="Stop loss ticks" />
            <input type="number" value={state.stopLoss || ''} onChange={(event) => onFieldChange('stopLoss', Number(event.target.value))} aria-label="Stop loss price" />
            <input readOnly value={currency.format(calculations.riskAmount)} aria-label="Stop loss money" />
            <input readOnly value={`${state.riskPercent || 0}%`} aria-label="Stop loss percent" />
          </div>
        </div>
      </div>

      {calculations.errors.length > 0 && (
        <div className="backtest-order-errors">{calculations.errors[0]}</div>
      )}

      <div className="backtest-order-actions">
        <button type="button" className={state.selectedOrderSide === 'buy' ? 'is-buy' : 'is-sell'} onClick={() => handlePlaceOrder(false)}>
          <strong>{sideLabel}</strong>
          <span>{calculations.quantity} {state.symbol} {orderTypeLabel}</span>
        </button>
        <button type="button" onClick={() => handlePlaceOrder(true)}>
          {sideLabel} and Journal
        </button>
      </div>

      <div className="backtest-order-info">
        <strong>Order info</strong>
        <dl className="backtest-calcs">
          <div><dt>Opposite side</dt><dd>{oppositeSideLabel}</dd></div>
          <div><dt>Position size</dt><dd>{calculations.quantity}</dd></div>
          <div><dt>Tick value</dt><dd>{currency.format(calculations.riskAmount / Math.max(calculations.quantity, 1))}</dd></div>
          <div><dt>Total balance after trade</dt><dd>{currency.format(effectiveBalance + calculations.rewardAmount)}</dd></div>
        </dl>
      </div>
    </aside>
  );
}

export default BacktestOrderPanel;
