export const paginate = (items, requestedPage, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));

  return {
    page,
    totalPages,
    rows: items.slice(start, start + pageSize),
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
    pages: Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index),
  };
};

export default paginate;
