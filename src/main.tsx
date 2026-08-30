import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ClerkAppWrapper } from './components/auth/ClerkAuthProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkAppWrapper>
      <App />
    </ClerkAppWrapper>
  </StrictMode>,
);
