import React, { useEffect, useState } from 'react';

export function WordRotate({ words = [], duration = 2500, className = '' }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!words.length) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setVisible(true);
      }, 250);
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span
        className={`inline-block transition-all duration-300 transform ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
        } ${className}`}
      >
        {words[index]}
      </span>
    </span>
  );
}

export default WordRotate;
