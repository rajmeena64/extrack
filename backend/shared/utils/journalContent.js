const MAX_CONTENT_BYTES = 100 * 1024;
const MAX_NODES = 5000;
const EMPTY_DOC = Object.freeze({ type: 'doc', content: [{ type: 'paragraph' }] });

const NODE_TYPES = new Set([
  'doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem',
  'blockquote', 'codeBlock', 'hardBreak', 'horizontalRule', 'image',
]);
const MARK_TYPES = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'textStyle', 'highlight']);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function safeUrl(value, { image = false } = {}) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (image && url.protocol !== 'https:') return null;
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeAttrs(type, attrs = {}) {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return undefined;
  if (type === 'paragraph' || type === 'heading') {
    return ['left', 'center', 'right', 'justify'].includes(attrs.textAlign)
      ? { ...(type === 'heading' ? { level: [1, 2, 3].includes(attrs.level) ? attrs.level : 2 } : {}), textAlign: attrs.textAlign }
      : type === 'heading' ? { level: [1, 2, 3].includes(attrs.level) ? attrs.level : 2 } : undefined;
  }
  if (type === 'image') {
    const src = safeUrl(attrs.src, { image: true });
    return src ? { src, alt: String(attrs.alt || '').slice(0, 300), title: String(attrs.title || '').slice(0, 300) } : null;
  }
  if (type === 'link') {
    const href = safeUrl(attrs.href);
    return href ? { href, target: '_blank', rel: 'noopener noreferrer nofollow' } : null;
  }
  if (type === 'textStyle' || type === 'highlight') {
    return COLOR_PATTERN.test(attrs.color || '') ? { color: attrs.color } : undefined;
  }
  return undefined;
}

function sanitizeJournalContent(value) {
  let nodeCount = 0;
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 30 || !NODE_TYPES.has(node.type)) return null;
    nodeCount += 1;
    if (nodeCount > MAX_NODES) throw new Error('Note is too large');

    const clean = { type: node.type };
    if (node.type === 'text') {
      if (typeof node.text !== 'string') return null;
      clean.text = node.text.slice(0, 50000);
      clean.marks = Array.isArray(node.marks)
        ? node.marks.flatMap((mark) => {
            if (!mark || !MARK_TYPES.has(mark.type)) return [];
            const attrs = sanitizeAttrs(mark.type, mark.attrs);
            if ((mark.type === 'link') && !attrs) return [];
            return [{ type: mark.type, ...(attrs ? { attrs } : {}) }];
          })
        : undefined;
      if (!clean.marks?.length) delete clean.marks;
      return clean;
    }

    const attrs = sanitizeAttrs(node.type, node.attrs);
    if (node.type === 'image' && !attrs) return null;
    if (attrs) clean.attrs = attrs;
    if (Array.isArray(node.content)) {
      clean.content = node.content.map((child) => walk(child, depth + 1)).filter(Boolean);
    }
    return clean;
  };

  const content = walk(value);
  if (!content || content.type !== 'doc') throw new Error('Invalid note content');
  if (!Array.isArray(content.content)) content.content = [{ type: 'paragraph' }];
  if (Buffer.byteLength(JSON.stringify(content), 'utf8') > MAX_CONTENT_BYTES) throw new Error('Note is too large');
  return content;
}

module.exports = { EMPTY_DOC, MAX_CONTENT_BYTES, sanitizeJournalContent };
