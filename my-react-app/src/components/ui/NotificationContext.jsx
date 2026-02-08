import { createContext, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Delete, Check, Info } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    // Auto hide after 3 seconds
    setTimeout(() => {
        setNotification(prev => (prev && prev.message === message ? null : prev));
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <AnimatePresence>
        {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 24, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              style={{
                position: 'fixed', 
                top: 0, 
                left: '50%', 
                background: notification.type === 'error' ? '#FF453A' : notification.type === 'info' ? '#007AFF' : '#32D74B',
                color: '#FFF',
                padding: '12px 24px', 
                borderRadius: '50px',
                fontWeight: '600', 
                fontSize: '15px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                zIndex: 9999, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                minWidth: '300px',
                justifyContent: 'center'
              }}
            >
              {notification.type === 'error' && <Delete size={18} />}
              {notification.type === 'success' && <Check size={18} />}
              {notification.type === 'info' && <Info size={18} />}
              {notification.message}
            </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within NotificationProvider");
    return context;
};
