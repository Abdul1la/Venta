import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            background: '#FFF', borderRadius: '24px', padding: '32px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
          }}
        >
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: isDestructive ? '#FFEDEC' : '#F5F5F7', 
            color: isDestructive ? '#FF453A' : '#007AFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>{title}</h3>
          <p style={{ margin: '0 0 32px', color: '#666', lineHeight: '1.5' }}>{message}</p>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={onCancel}
              className="btn"
              style={{ flex: 1, padding: '16px', background: '#F5F5F7', color: '#000', border: 'none' }}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className="btn"
              style={{ 
                flex: 1, padding: '16px', border: 'none', 
                background: isDestructive ? '#FF453A' : '#007AFF',
                color: '#FFF'
              }}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
