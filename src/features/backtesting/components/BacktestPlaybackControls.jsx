import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GripHorizontal, Pause, Play } from '../../../icons/lucideIcons';

const SPEEDS = [1, 2, 5, 10];

function BacktestPlaybackControls({ isPlaying, speed, onTogglePlay, onStep, onSpeedChange }) {
  const [pos, setPos] = useState({ x: 20, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const initialRef = useRef({ x: 0, y: 0, pos: { x: 0, y: 0 } });

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return;
    
    setIsDragging(true);
    initialRef.current = {
      x: e.clientX,
      y: e.clientY,
      pos: { ...pos },
    };
    
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragRef.current) return;

    const dx = e.clientX - initialRef.current.x;
    const dy = e.clientY - initialRef.current.y;

    let nextX = initialRef.current.pos.x + dx;
    let nextY = initialRef.current.pos.y + dy;

    // Boundary constraints
    const parent = dragRef.current.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const rect = dragRef.current.getBoundingClientRect();
      
      const maxX = parentRect.width - rect.width - 10;
      const maxY = parentRect.height - rect.height - 10;

      nextX = Math.max(10, Math.min(nextX, maxX));
      nextY = Math.max(10, Math.min(nextY, maxY));
    }

    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className={`backtest-playback is-floating ${isDragging ? 'is-dragging' : ''}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={dragRef}
    >
      <div className="backtest-playback__drag-handle">
        <GripHorizontal size={14} />
      </div>

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
    </div>
  );
}

export default BacktestPlaybackControls;
