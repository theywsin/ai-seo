import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('ai-seo-app-root') || document.getElementById('root');
createRoot(container!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
