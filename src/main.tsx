import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ThemeProvider } from 'next-themes';
import '@fontsource-variable/chivo';
import '@fontsource-variable/space-grotesk';
import './index.css';
import { captureLanding } from '@riff/core/lib/attribution';

captureLanding();

// Tela "sem conexão" (public/sw.js). Só na versão publicada: em desenvolvimento atrapalharia o recarregamento.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sem service worker o app funciona igual; só não tem a tela "sem conexão"
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" enableSystem={false} attribute="data-theme">
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
