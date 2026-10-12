import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const targetDirs = [
  join(root, 'src', 'features', 'markets', 'components', 'TradingChart'),
  join(root, 'backend', 'integrations', 'datafeed'),
];
const extensions = /\.(?:js|jsx|ts|tsx|mjs)$/;

const files = [];
const visit = (directory) => {
  try {
    readdirSync(directory).forEach((name) => {
      if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'build') return;
      const path = join(directory, name);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (extensions.test(name)) {
        files.push(path);
      }
    });
  } catch {
    // ignore unreadable dirs
  }
};

targetDirs.forEach(visit);

const failures = [];

// 1. Banned magic constants in pagination / dynamic limit logic
const bannedMagicPaginationRegex = /\b(?:countBack|requestedCountBack)\s*[:=]\s*(?:600|250)\b/;

// 2. Prohibited hardcoded day heuristics in SQL datafeed files
const datafeedDayCheckRegex = /\b(?:day|weekday|dayName|dayOfWeek)\s*===?\s*['"](?:Friday|Monday|Sunday|Saturday)['"]/i;

// 3. Prohibited hardcoded 600 fallback
const hardcoded600FallbackRegex = /:\s*600\s*;/;

for (const file of files) {
  const relPath = relative(root, file).replaceAll('\\', '/');

  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (trimmed.includes('integrity-allow:')) return;

    // Check 1: Day-of-week heuristics in datafeed
    if (relPath.includes('datafeed') && datafeedDayCheckRegex.test(trimmed)) {
      failures.push({
        file: relPath,
        line: lineNum,
        reason: 'Prohibited hardcoded day-of-week check in datafeed',
        code: trimmed,
      });
    }

    // Check 2: Banned magic constants in dynamic chart pagination
    if (relPath.includes('useChartDataEngine.js') && hardcoded600FallbackRegex.test(trimmed)) {
      failures.push({
        file: relPath,
        line: lineNum,
        reason: 'Prohibited hardcoded magic 600 fallback in dynamic chart pagination',
        code: trimmed,
      });
    }
  });
}

if (failures.length > 0) {
  console.error('\n❌ Code Integrity & Ponytail Check Failed:');
  failures.forEach((f) => {
    console.error(`  ${f.file}:${f.line} -> ${f.reason}`);
    console.error(`     Snippet: ${f.code}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ Code integrity and Ponytail compliance check passed.');
  process.exit(0);
}
