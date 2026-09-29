import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ThemeProvider } from 'next-themes';
import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" enableSystem={false} attribute="data-theme">
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
