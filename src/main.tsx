import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ThemeProvider } from 'next-themes';
import '@fontsource-variable/chivo';
import '@fontsource-variable/space-grotesk';
import './index.css';
import { captureLanding } from './lib/attribution';

captureLanding();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" enableSystem={false} attribute="data-theme">
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
