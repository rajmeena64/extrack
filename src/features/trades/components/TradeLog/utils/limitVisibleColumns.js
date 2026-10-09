export const limitVisibleColumns = (options, columns, limit) => {
  const keys = Array.isArray(columns)
    ? columns
    : (columns instanceof Set ? Array.from(columns) : Object.keys(columns || {}).filter((k) => Boolean(columns[k])));
  const selected = new Set(keys);
  const result = {};
  let count = 0;
  options.forEach(([key]) => {
    const isVisible = selected.has(key) && count < limit;
    if (isVisible) count += 1;
    result[key] = isVisible;
  });
  return result;
};

export default limitVisibleColumns;
