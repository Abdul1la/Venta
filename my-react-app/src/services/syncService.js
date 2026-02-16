import { db as localDb } from '../lib/db';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db as firebaseDb } from '../lib/firebase';
import { inventoryService } from '../features/warehouse/inventory/inventoryService';

export const syncService = {
  /**
   * Initialize the sync listener
   */
  init() {
    window.addEventListener('online', () => {
      // Small delay to ensure connection is truly established
      setTimeout(() => this.syncPendingSales(), 2000);
    });
    // Also try to sync on load if online
    if (navigator.onLine) {
      this.syncPendingSales();
    }
  },

  /**
   * Sync Pending Sales from Dexie to Firebase
   * Writes DIRECTLY to Firestore (bypasses salesService offline checks)
   */
  async syncPendingSales() {
    console.log('[Sync] Checking for pending sales...');
    
    if (!navigator.onLine) {
      console.log('[Sync] Still offline, skipping.');
      return;
    }

    try {
      // Get all pending sales
      const pendingSales = await localDb.sales
        .where('status')
        .equals('PENDING_SYNC')
        .toArray();

      if (pendingSales.length === 0) {
        console.log('[Sync] No pending sales found.');
        return;
      }

      console.log(`[Sync] Found ${pendingSales.length} pending sales. Syncing...`);

      for (const sale of pendingSales) {
        try {
          console.log(`[Sync] Syncing sale ID: ${sale.id}`, sale);
          
          // 1. Prepare sale data for Firebase (remove local-only fields)
          const saleDataForFirebase = { ...sale };
          const localId = saleDataForFirebase.id;
          delete saleDataForFirebase.id;        // Dexie auto-generated ID
          delete saleDataForFirebase.status;     // Local status field
          delete saleDataForFirebase.synced;     // Local sync flag
          
          // Convert date string to Firestore Timestamp
          saleDataForFirebase.createdAt = Timestamp.now();
          if (!saleDataForFirebase.date) {
            saleDataForFirebase.date = new Date().toISOString().split('T')[0];
          }

          // 2. Write sale record DIRECTLY to Firestore (bypass salesService)
          const docRef = await addDoc(collection(firebaseDb, "sales"), saleDataForFirebase);
          console.log(`[Sync] Sale record created in Firebase: ${docRef.id}`);

          // 3. Deduct stock in Firebase
          if (sale.items && sale.items.length > 0) {
            await inventoryService.processSale(sale.items);
            console.log(`[Sync] Stock deducted for ${sale.items.length} items.`);
          }
          
          // 4. Mark local record as synced
          await localDb.sales.update(localId, {
            status: 'COMPLETED',
            synced: true,
            firebaseSaleId: docRef.id,
            syncedAt: new Date().toISOString()
          });

          console.log(`[Sync] Sale ${localId} synced successfully.`);
          
        } catch (err) {
          console.error(`[Sync] Failed to sync sale ${sale.id}:`, err);
          // Don't throw — continue with next sale
        }
      }
      
      console.log('[Sync] Sync process finished.');

    } catch (error) {
      console.error('[Sync] General error during sync:', error);
    }
  }
};
