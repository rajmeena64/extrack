import React from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from '../../../icons/lucideIcons';

const SPEEDS = [1, 2, 5, 10];

function formatReplayTime(candle) {
  if (!candle?.time) return 'No candle';
  return new Date(candle.time * 1000).toLocaleString();
}

function BacktestPlaybackControls({ isPlaying, speed, currentCandle, onTogglePlay, onStep, onSpeedChange }) {
  return (
    <div className="backtest-playback">
      <div className="backtest-playback__buttons">
        <button type="button" onClick={() => onStep(-1)} title="Previous candle" aria-label="Previous candle">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button className="backtest-playback__primary" type="button" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause replay' : 'Play replay'}>
          {isPlaying ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => onStep(1)} title="Next candle" aria-label="Next candle">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="backtest-speed-selector" aria-label="Replay speed">
        {SPEEDS.map((item) => (
          <button key={item} type="button" className={speed === item ? 'is-active' : ''} onClick={() => onSpeedChange(item)}>
            {item}x
          </button>
        ))}
      </div>

      <span className="backtest-replay-time">{formatReplayTime(currentCandle)}</span>
    </div>
  );
}

export default BacktestPlaybackControls;
