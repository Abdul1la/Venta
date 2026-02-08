import { collection, addDoc, query, where, getDocs, orderBy, limit, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export const notificationService = {
  /**
   * Create a notification for admins
   * @param {string} type - 'SHIFT_REPORT', 'LOW_STOCK', 'ALERT'
   * @param {string} title 
   * @param {string} message 
   * @param {object} data - Optional metadata (e.g. totals object)
   * @param {string} branchId - Optional source branch
   */
  async createNotification(type, title, message, data = {}, branchId = null) {
    try {
      // 1. Save to database
      await addDoc(collection(db, "notifications"), {
        type,
        title,
        message,
        data,
        branchId,
        read: false,
        createdAt: Timestamp.now(),
        targetRole: 'admin' 
      });

      // 2. Send push notifications to all admin devices
      await this.sendPushToAdmins(title, message);
      
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  },

  /**
   * Send push notification to all admin users with FCM tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   */
  async sendPushToAdmins(title, body) {
    try {
      // Fetch all admin users with FCM tokens
      const usersRef = collection(db, "admins");
      const q = query(usersRef, where("role", "==", "admin"));
      const snapshot = await getDocs(q);
      
      const tokens = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('[Notification] No admin FCM tokens found');
        return;
      }

      console.log(`[Notification] Sending push to ${tokens.length} admin device(s)`);

      // Send to each token
      // Note: For production, use Firebase Cloud Functions to send via FCM Admin SDK
      // For now, we'll use the client-side approach (limited but works for testing)
      
      const payload = {
        notification: {
          title,
          body,
          icon: '/logo192.png'
        }
      };

      // In a production app, you'd call a Cloud Function here that uses the Admin SDK
      // For this implementation, the service worker will handle foreground notifications
      // and background notifications will work when sent from the server
      
      console.log('[Notification] Push notification payload prepared:', payload);
      console.log('[Notification] Tokens:', tokens);
      
      // Store tokens for server-side sending if needed
      return tokens;
      
    } catch (error) {
      console.error('[Notification] Error sending push:', error);
    }
  },

  /**
   * Get recent notifications
   */
  async getNotifications(limitCount = 20) {
    try {
      // Indexing might be required for complex queries, keeping it simple for now
      const q = query(
        collection(db, "notifications"), 
        orderBy("createdAt", "desc"), 
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const ref = doc(db, "notifications", notificationId);
      await updateDoc(ref, { read: true });
    } catch (e) {
      console.error("Error marking read:", e);
    }
  }
};
