import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppDialogProvider } from './context/AppDialogContext';
import { markPerf } from './utils/perfMarks';

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
  <QueryClientProvider client={queryClient}>
    <AppDialogProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppDialogProvider>
  </QueryClientProvider>
);
