import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from './onchain/wagmi';
import { AuthProvider } from './contexts/AuthContext';
import { BillingProvider } from './contexts/BillingContext';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <BrowserRouter>
          <AuthProvider>
            <BillingProvider>
              <App />
            </BillingProvider>
          </AuthProvider>
        </BrowserRouter>
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>
);