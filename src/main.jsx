import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppBootstrap from './AppBootstrap';
import { AuthProvider } from './context/AuthContext';
import { AppDialogProvider } from './context/AppDialogContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppDialogProvider>
        <AuthProvider>
          <AppBootstrap />
        </AuthProvider>
      </AppDialogProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
