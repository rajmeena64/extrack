import React, { useCallback, useState } from 'react';
import MainContentWrapper from '../../components/Layout/MainContentWrapper';
import { PanelRightOpen } from '../../icons/lucideIcons';
import BacktestBottomPanel from './components/BacktestBottomPanel';
import BacktestChart from './components/BacktestChart';
import BacktestOrderPanel from './components/BacktestOrderPanel';
import { useBacktestSession } from './hooks/useBacktestSession';
import './BacktestingPage.css';

function BacktestingPage() {
  const [bottomPanelHeight, setBottomPanelHeight] = useState(230);
  const [bottomPanelState, setBottomPanelState] = useState('open');
  const [orderPanelOpen, setOrderPanelOpen] = useState(true);
  const [orderPanelWidth, setOrderPanelWidth] = useState(310);
  const {
    state,
    currentCandle,
    journalStatus,
    setField,
    step,
    placeOrder,
    closePosition,
    saveTradeToJournal,
  } = useBacktestSession();

  const startBottomResize = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = bottomPanelHeight;
    document.body.classList.add('backtest-is-resizing');

    const handlePointerMove = (moveEvent) => {
      const nextHeight = Math.min(460, Math.max(96, startHeight + startY - moveEvent.clientY));
      setBottomPanelHeight(nextHeight);
      setBottomPanelState('open');
    };

    const handlePointerUp = () => {
      document.body.classList.remove('backtest-is-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [bottomPanelHeight]);

  const startOrderResize = useCallback((event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = orderPanelWidth;
    document.body.classList.add('backtest-is-resizing');

    const handlePointerMove = (moveEvent) => {
      setOrderPanelWidth(Math.min(430, Math.max(260, startWidth + startX - moveEvent.clientX)));
    };

    const handlePointerUp = () => {
      document.body.classList.remove('backtest-is-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [orderPanelWidth]);

  return (
    <MainContentWrapper className="backtesting-page">
      <header className="backtest-header">
        <div className="backtest-header__top">
          <div className="backtest-header__titleBlock">
            <span className="backtest-header__eyebrow">Replay lab</span>
            <h1 className="backtest-header__title">Backtesting</h1>
          </div>
        </div>
      </header>

      <div className="backtest-terminal">
        <div
          className={orderPanelOpen ? 'backtest-workspace' : 'backtest-workspace backtest-workspace--full-chart'}
          style={orderPanelOpen ? { '--order-panel-width': `${orderPanelWidth}px` } : undefined}
        >
          <div className="backtest-center">
            <BacktestChart
              candles={state.candles}
              currentIndex={state.currentIndex}
              strictReplay={state.strictReplay}
              currentCandle={currentCandle}
              entryPrice={state.entryPrice}
              stopLoss={state.stopLoss}
              takeProfit={state.takeProfit}
              openPositions={state.openPositions}
              closedPositions={state.closedPositions}
              timeframe={state.timeframe}
              selectedOrderSide={state.selectedOrderSide}
              marketPrice={currentCandle?.close || state.entryPrice || 0}
              onTimeframeChange={(value) => setField('timeframe', value)}
              onSideChange={(value) => setField('selectedOrderSide', value)}
              onOpenOrderPanel={() => setOrderPanelOpen(true)}
              isPlaying={state.isPlaying}
              playbackSpeed={state.playbackSpeed}
              onTogglePlay={() => setField('isPlaying', !state.isPlaying)}
              onStep={step}
              onSpeedChange={(value) => setField('playbackSpeed', value)}
            />

            {bottomPanelState !== 'hidden' ? (
              <BacktestBottomPanel
                orders={state.orders}
                openPositions={state.openPositions}
                closedPositions={state.closedPositions}
                journalDrafts={state.journalDrafts}
                collapsed={bottomPanelState === 'collapsed'}
                style={{ height: bottomPanelState === 'collapsed' ? 48 : bottomPanelHeight }}
                onResizeStart={startBottomResize}
                onCollapse={() => setBottomPanelState((value) => (value === 'collapsed' ? 'open' : 'collapsed'))}
                onClose={() => setBottomPanelState('hidden')}
                onClosePosition={closePosition}
                onJournalTrade={saveTradeToJournal}
              />
            ) : (
              <button
                className="backtest-panel-restore backtest-panel-restore--bottom"
                type="button"
                onClick={() => setBottomPanelState('open')}
              >
                Show orders
              </button>
            )}
          </div>

          {orderPanelOpen ? (
            <div className="backtest-order-dock" style={{ width: orderPanelWidth }}>
              <button
                className="backtest-pane-resizer backtest-pane-resizer--vertical"
                type="button"
                aria-label="Resize order panel"
                onPointerDown={startOrderResize}
              />
              <BacktestOrderPanel
                state={state}
                currentCandle={currentCandle}
                onClose={() => setOrderPanelOpen(false)}
                onFieldChange={setField}
                onPlaceOrder={placeOrder}
                onJournalTrade={saveTradeToJournal}
              />
            </div>
          ) : (
            <button
              className="backtest-panel-restore backtest-panel-restore--order"
              type="button"
              title="Show order panel"
              aria-label="Show order panel"
              onClick={() => setOrderPanelOpen(true)}
            >
              <PanelRightOpen size={16} aria-hidden="true" />
              Order
            </button>
          )}
        </div>

        {journalStatus && <div className="backtest-status-note">{journalStatus}</div>}
      </div>
    </MainContentWrapper>
  );
}

export default BacktestingPage;
