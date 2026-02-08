import { useState, useEffect } from 'react';
import { Bell, Check, X, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../features/common/services/notificationService';

const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        const data = await notificationService.getNotifications(20);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
    };

    // Poll every 30s
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id) => {
        await notificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getIcon = (type) => {
        switch(type) {
            case 'SHIFT_REPORT': return <FileText size={16} color="#007AFF" />;
            case 'LOW_STOCK': return <AlertTriangle size={16} color="#FF9500" />;
            default: return <Bell size={16} color="#555" />;
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ position: 'relative', background: 'transparent', border: 'none', padding: '8px', cursor: 'pointer' }}
            >
                <Bell size={24} color="#555" />
                {unreadCount > 0 && (
                    <span style={{ 
                        position: 'absolute', top: 0, right: 0, 
                        background: '#FF453A', color: '#FFF', 
                        fontSize: '10px', height: '16px', minWidth: '16px', 
                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', padding: '0 4px', border: '2px solid #FFF'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }} 
                            onClick={() => setIsOpen(false)} 
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            style={{
                                position: 'absolute', top: '100%', right: -10, width: '360px',
                                background: '#FFF', borderRadius: '16px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                border: '1px solid #E5E5EA',
                                zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                maxHeight: '80vh'
                            }}
                        >
                            <div style={{ padding: '16px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Notifications</h3>
                                <button className="btn" onClick={loadNotifications} style={{ fontSize: '11px', padding: '4px 8px' }}>Refresh</button>
                            </div>

                            <div style={{ overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div 
                                            key={n.id}
                                            style={{ 
                                                padding: '16px', borderBottom: '1px solid #F9F9F9',
                                                background: n.read ? '#FFF' : '#F5F9FF',
                                                transition: 'background 0.2s', position: 'relative'
                                            }}
                                        >
                                            {!n.read && <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: '#007AFF' }} />}
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ 
                                                    background: n.read ? '#F0F0F5' : '#E5F1FF', 
                                                    minWidth: '32px', height: '32px', borderRadius: '8px', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                }}>
                                                    {getIcon(n.type)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '14px', color: n.read ? '#333' : '#000' }}>{n.title}</span>
                                                        <span style={{ fontSize: '10px', color: '#999' }}>
                                                            {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: '4px 0 8px', fontSize: '13px', color: '#666', lineHeight: 1.4 }}>{n.message}</p>
                                                    
                                                    {/* Data Payload Display */}
                                                    {n.data && n.type === 'SHIFT_REPORT' && (
                                                        <div style={{ background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: '6px', fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                                            {Object.entries(n.data).map(([key, val]) => (
                                                                <div key={key}><span style={{fontWeight:600}}>{key}:</span> {val}</div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {!n.read && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                                                            style={{ 
                                                                background: 'transparent', border: 'none', color: '#007AFF', 
                                                                fontSize: '11px', fontWeight: 600, padding: 0, marginTop: '8px', cursor: 'pointer' 
                                                            }}
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
