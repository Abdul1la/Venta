import Dexie from 'dexie';

export const db = new Dexie('VentaPOS_DB');

db.version(1).stores({
  products: '++id, barcode, branchId, name', // Index for searching by barcode/branch
  sales: '++id, date, status, synced', // Index for syncing
  syncQueue: '++id, type, timestamp' // General sync queue
});

export const cacheInventory = async (products) => {
  try {
    await db.products.bulkPut(products);
    console.log(`Cached ${products.length} products to offline DB.`);
  } catch (err) {
    console.error("Failed to cache inventory:", err);
  }
};

export const saveOfflineSale = async (saleData) => {
  try {
    const id = await db.sales.add({
      ...saleData,
      status: 'PENDING_SYNC',
      synced: false,
      date: new Date().toISOString()
    });
    return id;
  } catch (err) {
    console.error("Failed to save offline sale:", err);
    throw err;
  }
};
