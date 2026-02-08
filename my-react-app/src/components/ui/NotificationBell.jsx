import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../../features/common/services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    
    // Setup foreground message listener
    setupForegroundListener();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(10);
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('[NotificationBell] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupForegroundListener = async () => {
    try {
      const { fcmService } = await import('../../lib/fcmService');
      fcmService.onForegroundMessage((payload) => {
        console.log('[NotificationBell] Foreground notification received:', payload);
        // Reload notifications when a new one arrives
        loadNotifications();
        
        // Show browser notification even when app is open
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'New Notification', {
            body: payload.notification?.body || 'You have a new notification',
            icon: '/logo192.png'
          });
        }
      });
    } catch (error) {
      console.error('[NotificationBell] Error setting up foreground listener:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('[NotificationBell] Error marking as read:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          background: '#FFF',
          border: '1px solid #E5E5EA',
          borderRadius: '12px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
        }}
      >
        <Bell size={18} color="#666" />
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#FF453A',
              color: '#FFF',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '350px',
              maxHeight: '400px',
              background: '#FFF',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '1px solid #E5E5EA',
              overflow: 'hidden',
              zIndex: 1000
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid #E5E5EA' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Notifications</h3>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #F5F5F7',
                      cursor: 'pointer',
                      background: notif.read ? '#FFF' : '#F9F9FB',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = notif.read ? '#FFF' : '#F9F9FB')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#000' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {formatTime(notif.createdAt)}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {notif.message}
                    </div>
                    {!notif.read && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#007AFF', marginTop: '8px' }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
