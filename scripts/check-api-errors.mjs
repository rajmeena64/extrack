import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'backend');
const extensions = /\.(?:js|mjs)$/;
const rawErrorRegex = /res\.(?:status\([^)]*\)\.)?(?:json|send)\([^)]*(?:\b(?:err|error)\.message|\berror:\s*(?:err|error)\b|\b(?:err|error)\.stack)/;

const files = [];
const visit = (directory) => {
  try {
    readdirSync(directory).forEach((name) => {
      if (name === 'node_modules' || name === '.git') return;
      const path = join(directory, name);
      const stat = statSync(path);
      if (stat.isDirectory()) visit(path);
      else if (extensions.test(name)) files.push(path);
    });
  } catch {}
};
visit(root);

const failures = [];
for (const file of files) {
  const relPath = relative(process.cwd(), file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (rawErrorRegex.test(trimmed)) {
      failures.push({ file: relPath, line: index + 1, code: trimmed });
    }
  });
}

if (failures.length > 0) {
  console.error('\n❌ Raw API Error Leak Check Failed:');
  failures.forEach((f) => {
    console.error(`  ${f.file}:${f.line} -> Raw error leaked in API response!`);
    console.error(`     Code: ${f.code}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ API error safety check passed: No raw errors leaked in API responses.');
  process.exit(0);
}
