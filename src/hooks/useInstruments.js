import { useQuery } from '@tanstack/react-query';
import api from '../utils/serve';

export function filterInstruments(instruments, query, limit = 30) {
  const source = Array.isArray(instruments) ? instruments : [];
  const q = String(query || '').trim().toLowerCase();

  if (!q) return source.slice(0, Math.min(limit, 20));

  return source
    .filter((item) => (
      String(item.symbol || '').toLowerCase().includes(q) ||
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.type || '').toLowerCase().includes(q) ||
      String(item.category || '').toLowerCase().includes(q)
    ))
    .slice(0, limit);
}

export function isAllowedInstrumentSymbol(instruments, symbol) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  if (!normalizedSymbol || !Array.isArray(instruments)) return false;

  return instruments.some((instrument) => instrument.symbol === normalizedSymbol);
}

export function useInstruments() {
  return useQuery({
    queryKey: ['instruments'],
    queryFn: async () => {
      const { data } = await api.get('/instruments');
      return Array.isArray(data) ? data : [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
