import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initInstallPromptCapture } from './core/pwa/installPrompt';
import './index.css';

// Captura o evento de instalação ANTES de o React montar: o Chrome o dispara
// muito cedo, e um listener registrado dentro de um useEffect chegaria tarde.
initInstallPromptCapture();

// Ativa o Service Worker do PWA imediatamente
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
