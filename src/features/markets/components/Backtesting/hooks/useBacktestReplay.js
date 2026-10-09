import { useEffect } from 'react';

export function useBacktestReplay({ isPlaying, playbackSpeed, onStep }) {
  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalMs = Math.max(1200 / Number(playbackSpeed || 1), 120);
    const timer = window.setInterval(() => {
      onStep(1);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, onStep, playbackSpeed]);
}
