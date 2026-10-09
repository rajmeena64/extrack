import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = [join(process.cwd(), 'src')];
const extensions = /\.(?:js|jsx|ts|tsx)$/;

const allowedFiles = new Set([]);

const files = [];
const visit = (directory) => {
  readdirSync(directory).forEach((name) => {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === '.venv' || name === '__pycache__') return;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      visit(path);
    } else if (extensions.test(name)) {
      files.push(path);
    }
  });
};
roots.forEach((r) => visit(r));

const failures = [];

const sameObjDotRegex = /(?<![!\w$])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z0-9_$]+)\s*(?:\|\||\?\?)\s*\1\.([a-zA-Z0-9_$]+)/;
const sameObjBracketRegex = /(?<![!\w$])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\[['"`]([^'"`]+)['"`]\]\s*(?:\|\||\?\?)\s*\1\[['"`]([^'"`]+)['"`]\]/;
const pySameObjGetRegex = /(?<![!\w$])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.get\(['"`]([^'"`]+)['"`]\)\s+or\s+\1\.get\(['"`]([^'"`]+)['"`]\)/;
const pySameObjDotRegex = /(?<![!\w$])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z0-9_$]+)\s+or\s+\1\.([a-zA-Z0-9_$]+)/;
const pySameObjBracketRegex = /(?<![!\w$])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\[['"`]([^'"`]+)['"`]\]\s+or\s+\1\[['"`]([^'"`]+)['"`]\]/;
const pyGetOrRegex = /\.get\([^)]+\)\s+or\b/;
const pyLiteralOrRegex = /\bor\s+(?:['"][^'"]*['"]|[-+]?\d+(?:\.\d+)?|\[\]|\{\})(?!\s*(?:in\b|==|!=|<|>|<=|>=))/;
const pyGetDefaultRegex = /(?<!os\.environ)\.get\(\s*['"][^'"]+['"]\s*,\s*(?:['"][^'"]*['"]|[-+]?\d+(?:\.\d+)?|\[\]|\{\})\s*\)/;

const allowedGlobals = new Set(['window', 'document', 'navigator', 'globalThis']);
const allowedDomProps = new Set([
  'key', 'code', 'button', 'which', 'target', 'srcElement',
  'defaultPrevented', 'isFocused', 'isHovered',
  'metaKey', 'ctrlKey', 'shiftKey', 'altKey',
]);

for (const file of files) {
  const relPath = relative(process.cwd(), file).replaceAll('\\', '/');
  if (allowedFiles.has(relPath)) continue;

  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) return;

    const hasInlineBypass = trimmed.includes('fallback-allow:');
    const prevLine = index > 0 ? lines[index - 1].trim() : '';
    const hasPrevBypass = prevLine.includes('fallback-allow:');
    if (hasInlineBypass || hasPrevBypass) return;

    if (relPath.endsWith('.py')) {
      const getMatch = pySameObjGetRegex.exec(trimmed);
      if (getMatch && getMatch[2] !== getMatch[3]) {
        failures.push({ file: relPath, line: lineNum, type: 'Python Dict Key Permutation', expression: getMatch[0], snippet: trimmed });
        return;
      }
      const dotPyMatch = pySameObjDotRegex.exec(trimmed);
      if (dotPyMatch && dotPyMatch[2] !== dotPyMatch[3] && !['True', 'False', 'None'].includes(dotPyMatch[3])) {
        failures.push({ file: relPath, line: lineNum, type: 'Python Property Permutation', expression: dotPyMatch[0], snippet: trimmed });
        return;
      }
      const bracketPyMatch = pySameObjBracketRegex.exec(trimmed);
      if (bracketPyMatch && bracketPyMatch[2] !== bracketPyMatch[3]) {
        failures.push({ file: relPath, line: lineNum, type: 'Python Bracket Key Permutation', expression: bracketPyMatch[0], snippet: trimmed });
        return;
      }
      const getOrMatch = pyGetOrRegex.exec(trimmed);
      if (getOrMatch) {
        failures.push({ file: relPath, line: lineNum, type: 'Prohibited Dict Get Fallback', expression: getOrMatch[0], snippet: trimmed });
        return;
      }
      const litMatch = pyLiteralOrRegex.exec(trimmed);
      if (litMatch) {
        failures.push({ file: relPath, line: lineNum, type: 'Prohibited Literal Fallback', expression: litMatch[0], snippet: trimmed });
        return;
      }
      const getDefMatch = pyGetDefaultRegex.exec(trimmed);
      if (getDefMatch) {
        failures.push({ file: relPath, line: lineNum, type: 'Prohibited Get Default Value', expression: getDefMatch[0], snippet: trimmed });
        return;
      }
      return;
    }

    if (trimmed.startsWith('if (') && (trimmed.includes('===') || trimmed.includes('!==') || trimmed.includes('>'))) {
      return;
    }

    const dotMatch = sameObjDotRegex.exec(trimmed);
    if (dotMatch) {
      const [, obj, p1, p2] = dotMatch;
      if (allowedGlobals.has(obj)) return;

      if (p1 !== p2) {
        const isDomEvent = ['e', 'event', 'evt', 'state'].includes(obj) &&
          (allowedDomProps.has(p1) || allowedDomProps.has(p2));
        if (!isDomEvent) {
          failures.push({
            file: relPath,
            line: lineNum,
            type: 'Property Permutation',
            expression: dotMatch[0],
            snippet: trimmed,
          });
          return;
        }
      }
    }

    const bracketMatch = sameObjBracketRegex.exec(trimmed);
    if (bracketMatch) {
      const [, obj, p1, p2] = bracketMatch;
      if (allowedGlobals.has(obj)) return;

      if (p1 !== p2) {
        failures.push({
          file: relPath,
          line: lineNum,
          type: 'Bracket Property Permutation',
          expression: bracketMatch[0],
          snippet: trimmed,
        });
      }
    }
  });
}

if (failures.length > 0) {
  console.error('\n❌ Fallback Integrity Check FAILED!');
  console.error(`Found ${failures.length} prohibited property permutation(s) or speculative fallback(s):\n`);

  failures.forEach(({ file, line, type, expression, snippet }) => {
    console.error(`  [${type}] ${file}:${line}`);
    console.error(`    Found: "${expression}"`);
    console.error(`    Code:  ${snippet}`);
    console.error('    Fix:   Use authoritative canonical schema key from API contract.');
    console.error('           If genuine and intentional, add `// fallback-allow: <reason>` above this line.\n');
  });

  process.exit(1);
}

console.log('Fallback integrity check passed. No prohibited property permutations found.');
