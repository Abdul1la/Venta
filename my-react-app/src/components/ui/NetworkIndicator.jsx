import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { syncService } from '../../services/syncService';

export const NetworkIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialize sync service (registers global online listener)
    syncService.init();

    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      // Delay sync by 2s to ensure stable connection
      setTimeout(() => {
        syncService.syncPendingSales().finally(() => {
          setTimeout(() => setIsSyncing(false), 2000);
        });
      }, 2000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !isSyncing) return null; // Don't show anything if everything is fine

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px', // Left side to avoid covering Chat/Total
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 16px',
      borderRadius: '50px',
      background: isOnline ? '#10b981' : '#f43f5e', // Green for Syncing (Online), Red for Offline
      color: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      fontWeight: 600,
      fontSize: '13px',
      transition: 'all 0.3s ease'
    }}>
      {isOnline ? (
        <>
           <RefreshCw size={16} className="spin" />
           <span>Syncing Data...</span>
        </>
      ) : (
        <>
           <WifiOff size={16} />
           <span>Offline Mode</span>
        </>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
