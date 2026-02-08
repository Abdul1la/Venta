// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCROmI5S9CITU05Bi_07Fqcv3uDPfKZcUE",
  authDomain: "venta-e740c.firebaseapp.com",
  projectId: "venta-e740c",
  storageBucket: "venta-e740c.firebasestorage.app",
  messagingSenderId: "703159297432",
  appId: "1:703159297432:web:d60a439e6807118d2937ed",
  measurementId: "G-356E24WLC7"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo192.png', // You can customize this icon path
    badge: '/logo192.png',
    tag: 'notification',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
