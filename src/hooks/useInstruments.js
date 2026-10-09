import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/common/serve';

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function filterInstruments(instruments, query, limit = 30) {
  const source = Array.isArray(instruments) ? instruments : [];
  const q = String(query || '').trim().toLowerCase();
  return source.filter((item) => !q || `${item.symbol} ${item.name} ${item.displayName} ${(item.searchKeywords || []).join(' ')}`.toLowerCase().includes(q)).slice(0, limit);
}

export function isAllowedInstrumentSymbol(instruments, symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  return Array.isArray(instruments) && instruments.some((item) => item.symbol === normalized);
}

export function useAllInstruments() {
  return useQuery({
    queryKey: ['instruments-catalog'],
    queryFn: async () => {
      const { data } = await api.get('/instruments');
      return Array.isArray(data?.instruments) ? data.instruments : [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useInstruments(search = '', filters = {}) {
  const debouncedSearch = useDebouncedValue(search);
  const query = useAllInstruments();
  const all = query.data || [];

  const filtered = useMemo(() => {
    let res = all;
    if (filters.category) {
      const c = String(filters.category).toLowerCase();
      if (c === 'crypto') res = res.filter((i) => i.assetClass === 'crypto' || i.category === 'crypto');
      else if (c === 'forex_cfd') res = res.filter((i) => ['forex', 'cfd'].includes(i.category) || ['forex', 'forex_cfd', 'metal', 'energy'].includes(i.assetClass));
      else if (c === 'future' || c === 'futures') res = res.filter((i) => i.category === 'future' || i.productType === 'future' || i.productType === 'futures');
      else res = res.filter((i) => i.category?.toLowerCase() === c || i.assetClass?.toLowerCase() === c);
    }
    if (filters.productType) {
      const pt = String(filters.productType).toLowerCase();
      res = res.filter((i) => i.productType?.toLowerCase() === pt || i.category?.toLowerCase() === pt);
    }
    if (Array.isArray(filters.productTypes) && filters.productTypes.length > 0) {
      const pts = filters.productTypes.map((p) => String(p).toLowerCase());
      res = res.filter((i) => pts.includes(i.productType?.toLowerCase()) || pts.includes(i.category?.toLowerCase()));
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      res = res.filter((i) => i.symbol?.toLowerCase().includes(q) || i.name?.toLowerCase().includes(q) || i.displayName?.toLowerCase().includes(q));
    }
    const limit = Number(filters.limit) || (filters.category || debouncedSearch ? 50 : 2000);
    return res.slice(0, limit);
  }, [all, debouncedSearch, filters.category, filters.productType, filters.productTypes, filters.limit, search]);

  return { ...query, data: filtered };
}
