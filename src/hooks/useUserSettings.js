import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { loadCachedUserSettings, loadUserSettings } from '../utils/userSettings';

export const userSettingsQueryKey = (userId) => ['user-settings', userId || 'anonymous'];

export function useUserSettings(options = {}) {
  const { user, isAuthenticated, isAuthLoading } = useAuth();

  return useQuery({
    queryKey: userSettingsQueryKey(user?.ID),
    enabled: !isAuthLoading && isAuthenticated,
    queryFn: loadUserSettings,
    placeholderData: loadCachedUserSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
  });
}
