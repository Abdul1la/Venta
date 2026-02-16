import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }

    return this.props.children; 
  }
}

import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
// Register PWA Service Worker
// const updateSW = registerSW({
//   onNeedRefresh() {
//     if (confirm('New content available. Reload?')) {
//       updateSW(true);
//     }
//   },
//   onOfflineReady() {
//     console.log('[PWA] App ready to work offline');
//   },
// });

// Register Firebase Messaging Service Worker
if ('serviceWorker' in navigator) {
  // Use a different scope or check if VitePWA handles this? 
  // VitePWA usually generates 'sw.js'. Firebase uses 'firebase-messaging-sw.js'.
  // They can coexist if scopes are managed or if one imports the other.
  // For now, keeping both.
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('[SW] Firebase Messaging SW registered:', registration);
    })
    .catch((error) => {
      console.error('[SW] Firebase Messaging SW failed:', error);
    });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </StrictMode>,
)
