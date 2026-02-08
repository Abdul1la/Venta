import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const messaging = getMessaging(app);

const VAPID_KEY = 'BO6XMMY_Gqm5JiV8qFzn21BJlTIKGGhE7bUZmJplZka4RykFsLhezIKHdyDUO2k072y7AFyI6SJvq7KXUb81mrE';

export const fcmService = {
  /**
   * Request notification permission and get FCM token
   * @returns {Promise<string|null>} FCM token or null if permission denied
   */
  async requestPermissionAndGetToken() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('[FCM] Notification permission granted');
        
        // Wait for service worker to be ready
        if (!('serviceWorker' in navigator)) {
          throw new Error('Service workers not supported');
        }
        
        const registration = await navigator.serviceWorker.ready;
        console.log('[FCM] Service Worker ready for token request');
        
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });
        
        console.log('[FCM] Token obtained:', token);
        return token;
      } else {
        console.log('[FCM] Notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('[FCM] Error getting token:', error);
      return null;
    }
  },

  /**
   * Save FCM token to user document in Firestore
   * @param {string} userId - User ID
   * @param {string} token - FCM token
   */
  async saveTokenToUser(userId, token) {
    try {
      const userRef = doc(db, 'admins', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date()
      });
      console.log('[FCM] Token saved to user document');
    } catch (error) {
      console.error('[FCM] Error saving token:', error);
    }
  },

  /**
   * Listen for foreground messages (when app is open)
   * @param {Function} callback - Callback to handle incoming message
   */
  onForegroundMessage(callback) {
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      callback(payload);
    });
  }
};
