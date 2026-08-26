import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {AuthProvider} from './auth/AuthContext';
import {OwnerEditModeProvider} from './components/owner-edit/OwnerEditMode';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider><OwnerEditModeProvider><App /></OwnerEditModeProvider></AuthProvider>
  </StrictMode>,
);
