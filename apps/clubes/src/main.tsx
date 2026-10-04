import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'next-themes';
import '@fontsource-variable/chivo';
import '@fontsource-variable/space-grotesk';
import './index.css';
import { captureLanding } from '@riff/core/lib/attribution';
import { LegalProductContext } from '@riff/core/legal/product';
import App from './App';

captureLanding();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" enableSystem={false} attribute="data-theme">
        <LegalProductContext.Provider value="clubes">
          <App />
        </LegalProductContext.Provider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
