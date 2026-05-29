import React from 'react';
import MainContentWrapper from '../../components/Layout/MainContentWrapper';
import BacktestBottomPanel from './components/BacktestBottomPanel';
import BacktestChart from './components/BacktestChart';
import BacktestOrderPanel from './components/BacktestOrderPanel';
import BacktestPlaybackControls from './components/BacktestPlaybackControls';
import BacktestStatsBar from './components/BacktestStatsBar';
import BacktestToolbar from './components/BacktestToolbar';
import { useBacktestSession } from './hooks/useBacktestSession';
import './BacktestingPage.css';

function BacktestingPage() {
  const {
    state,
    currentCandle,
    stats,
    loadStatus,
    journalStatus,
    setField,
    step,
    placeOrder,
    closePosition,
    saveTradeToJournal,
    reloadCandles,
  } = useBacktestSession();

  return (
    <MainContentWrapper className="backtesting-page">
      <header className="backtest-header">
        <div className="backtest-header__top">
          <div className="backtest-header__titleBlock">
            <span className="backtest-header__eyebrow">Replay lab</span>
            <h1 className="backtest-header__title">Backtesting</h1>
            <span className="backtest-header__subtitle">{state.symbol} · {state.timeframe}</span>
          </div>

          <div className="backtest-header__meta">
            {stats.openTrades} open · {stats.totalTrades} closed
          </div>
        </div>

        <BacktestToolbar
          symbol={state.symbol}
          timeframe={state.timeframe}
          loadStatus={loadStatus}
          onSymbolChange={(value) => setField('symbol', value)}
          onTimeframeChange={(value) => setField('timeframe', value)}
          onReload={reloadCandles}
        />
      </header>

      <div className="backtest-terminal">
        <BacktestStatsBar stats={stats} />

        <div className="backtest-workspace">
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
            />

            <BacktestPlaybackControls
              isPlaying={state.isPlaying}
              speed={state.playbackSpeed}
              currentCandle={currentCandle}
              onTogglePlay={() => setField('isPlaying', !state.isPlaying)}
              onStep={step}
              onSpeedChange={(value) => setField('playbackSpeed', value)}
            />

            <BacktestBottomPanel
              orders={state.orders}
              openPositions={state.openPositions}
              closedPositions={state.closedPositions}
              journalDrafts={state.journalDrafts}
              onClosePosition={closePosition}
              onJournalTrade={saveTradeToJournal}
            />
          </div>

          <BacktestOrderPanel
            state={state}
            currentCandle={currentCandle}
            onFieldChange={setField}
            onPlaceOrder={placeOrder}
            onJournalTrade={saveTradeToJournal}
          />
        </div>

        {journalStatus && <div className="backtest-status-note">{journalStatus}</div>}
      </div>
    </MainContentWrapper>
  );
}

export default BacktestingPage;
