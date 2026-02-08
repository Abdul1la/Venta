const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function: Send push notifications when a new notification is created
 * Triggers: onCreate in 'notifications' collection
 */
exports.sendNotificationToAdmins = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data();
      console.log('[Cloud Function] New notification created:', notification);

      // Only send push for notifications targeting admins
      if (notification.targetRole !== 'admin') {
        console.log('[Cloud Function] Not targeting admins, skipping push');
        return null;
      }

      // 1. Fetch all admin users with FCM tokens
      const usersSnapshot = await admin.firestore()
        .collection('admins')
        .where('role', '==', 'admin')
        .get();

      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('[Cloud Function] No admin tokens found, skipping push');
        return null;
      }

      console.log(`[Cloud Function] Sending push to ${tokens.length} admin device(s)`);

      // 2. Prepare the notification payload
      const payload = {
        notification: {
          title: notification.title || 'New Notification',
          body: notification.message || 'You have a new notification',
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'admin-notification',
          requireInteraction: true
        },
        data: {
          notificationId: context.params.notificationId,
          type: notification.type,
          branchId: notification.branchId || '',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      };

      // 3. Send to all tokens
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data,
        webpush: {
          fcmOptions: {
            link: 'https://your-app-url.com/warehouse' // Update with your actual URL
          }
        }
      });

      console.log('[Cloud Function] Push notification sent successfully');
      console.log(`[Cloud Function] Success: ${response.successCount}, Failures: ${response.failureCount}`);

      // 4. Clean up invalid tokens
      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error('[Cloud Function] Failed to send to token:', tokens[idx], resp.error);
            // If token is invalid, mark for removal
            if (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(tokens[idx]);
            }
          }
        });

        // Remove invalid tokens from user documents
        if (tokensToRemove.length > 0) {
          console.log(`[Cloud Function] Removing ${tokensToRemove.length} invalid token(s)`);
          const batch = admin.firestore().batch();
          
          for (const token of tokensToRemove) {
            const userDocs = await admin.firestore()
              .collection('admins')
              .where('fcmToken', '==', token)
              .get();
            
            userDocs.forEach(doc => {
              batch.update(doc.ref, { fcmToken: admin.firestore.FieldValue.delete() });
            });
          }
          
          await batch.commit();
        }
      }

      return { success: true, sent: response.successCount };

    } catch (error) {
      console.error('[Cloud Function] Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Optional: Test function to manually trigger a notification
 * Can be called via HTTP for testing
 */
exports.testNotification = functions.https.onRequest(async (req, res) => {
  try {
    // Create a test notification
    await admin.firestore().collection('notifications').add({
      type: 'TEST',
      title: 'Test Notification',
      message: 'This is a test push notification',
      targetRole: 'admin',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: 'Test notification created' });
  } catch (error) {
    console.error('[Cloud Function] Test notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
