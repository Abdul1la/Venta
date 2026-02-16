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
            background: 'var(--color-bg-card)', borderRadius: '24px', padding: '32px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            border: '1px solid var(--color-border)'
          }}
        >
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '50%', 
            background: isDestructive ? 'rgba(255, 69, 58, 0.1)' : 'rgba(0, 122, 255, 0.1)', 
            color: isDestructive ? 'var(--color-error)' : 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <AlertTriangle size={28} />
          </div>

          <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</h3>
          <p style={{ margin: '0 0 32px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>{message}</p>

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={onCancel}
              className="btn"
              style={{ 
                flex: 1, padding: '12px', 
                background: 'var(--color-bg-secondary)', 
                color: 'var(--color-text-primary)', 
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontWeight: 600
              }}
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              className="btn"
              style={{ 
                flex: 1, padding: '12px', border: 'none', 
                background: isDestructive ? 'var(--color-error)' : 'var(--color-primary)',
                color: '#FFF',
                borderRadius: '12px',
                fontWeight: 600
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
