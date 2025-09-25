import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { BillingProvider } from './contexts/BillingContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BillingProvider>
          <App />
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);