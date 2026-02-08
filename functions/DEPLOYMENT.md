# Firebase Cloud Functions Deployment Guide

## 🚀 Setup Instructions

### Step 1: Install Firebase CLI

Open a terminal and run:

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser for you to sign in with your Google account.

### Step 3: Initialize Firebase (if not already done)

In your project root (`ClothingStore`), run:

```bash
firebase init
```

- Select **Functions** using arrow keys and spacebar
- Choose **Use an existing project**
- Select your project: `venta-e740c`
- Choose **JavaScript** (not TypeScript)
- Say **NO** to ESLint
- Say **YES** to install dependencies

### Step 4: Install Dependencies

Navigate to the functions directory:

```bash
cd functions
npm install
```

### Step 5: Deploy the Cloud Function

From the project root:

```bash
firebase deploy --only functions
```

This will deploy the function to Firebase servers.

---

## ✅ Verification

After deployment, you should see output like:

```
✔  functions[sendNotificationToAdmins(us-central1)] Successful create operation
✔  Deploy complete!
```

---

## 🧪 Testing

### Test 1: Close Register

1. Login as a cashier
2. Make a sale
3. Click "Close Register"
4. **Close your browser completely**
5. Check your phone/computer for a push notification!

### Test 2: Manual Test (Optional)

You can trigger a test notification by visiting:

```
https://us-central1-venta-e740c.cloudfunctions.net/testNotification
```

Replace the URL with your actual function URL (shown after deployment).

---

## 🔧 Troubleshooting

### Error: "Billing account not configured"

- You need to upgrade to the **Blaze Plan** (pay-as-you-go)
- Go to Firebase Console → Upgrade
- Don't worry - it's free for low usage!

### Error: "Firebase CLI not found"

- Run: `npm install -g firebase-tools`

### Notifications not working?

1. Check Firebase Console → Functions tab
2. Look for errors in the logs
3. Verify admin users have FCM tokens in Firestore
4. Make sure you granted notification permission in browser

---

## 📊 Monitoring

View function logs:

```bash
firebase functions:log
```

---

## 💰 Costs

Cloud Functions are **free** for:

- 2 million invocations/month
- 400,000 GB-sec compute time
- 200,000 GHz-sec compute time

For this app, you'll likely stay within the free tier!
