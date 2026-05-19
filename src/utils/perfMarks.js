const isDev = import.meta.env.DEV;
const marks = new Set();

export function markPerf(name) {
  if (!isDev || typeof performance === 'undefined') return;

  const markName = `extrack:${name}`;
  if (marks.has(markName)) return;

  marks.add(markName);
  performance.mark(markName);
  console.info(`[perf] ${name}`, `${Math.round(performance.now())}ms`);
}

export function measurePerf(name, startMark, endMark = name) {
  if (!isDev || typeof performance === 'undefined') return;

  const start = `extrack:${startMark}`;
  const end = `extrack:${endMark}`;
  if (!marks.has(start) || !marks.has(end)) return;

  try {
    performance.measure(`extrack:${name}`, start, end);
    const measures = performance.getEntriesByName(`extrack:${name}`);
    const latest = measures[measures.length - 1];
    if (latest) {
      console.info(`[perf] ${name}`, `${Math.round(latest.duration)}ms`);
    }
  } catch {
    // Dev-only diagnostics should never affect the app.
  }
}
