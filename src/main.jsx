import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDialogProvider } from './context/AppDialogContext';
import { markPerf } from './utils/perfMarks';


    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
    });


markPerf('app-start');

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


    <Sentry.ErrorBoundary
    fallback={
      <div style={{ padding: '24px' }}>
        <h2>Something went wrong.</h2>
        <p>Please refresh the page.</p>
      </div>
    }
  >
  <QueryClientProvider client={queryClient}>
    <AppDialogProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppDialogProvider>
  </QueryClientProvider>
   </Sentry.ErrorBoundary>
);
