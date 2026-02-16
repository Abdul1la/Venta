import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { db as localDb, cacheInventory, saveOfflineSale } from "../../../lib/db";

export const inventoryService = {
  /**
   * Fetch inventory for a specific branch
   * @param {string} branchId 
   */
  async getBranchInventory(branchId) {
    try {
      // 1. If online, always fetch fresh data from Firebase
      if (navigator.onLine) {
        const q = query(
          collection(db, "inventory"), 
          where("branchId", "==", branchId)
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Update local cache with fresh data
        await localDb.products.where('branchId').equals(branchId).delete();
        if (items.length > 0) {
          await cacheInventory(items);
        }

        return items;
      }

      // 2. Offline: use local DB
      const localItems = await localDb.products.where('branchId').equals(branchId).toArray();
      return localItems || [];
    } catch (error) {
      console.error("Error fetching inventory:", error);
      // Fallback to local DB if Firebase fails
      const offlineFallback = await localDb.products.where('branchId').equals(branchId).toArray();
      return offlineFallback || [];
    }
  },

  /**
   * Get single item by ID
   * @param {string} itemId 
   */
  async getItemById(itemId) {
    try {
      const docRef = doc(db, "inventory", itemId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching item:", error);
      throw error;
    }
  },

  /**
   * Get single item by ID
   * @param {string} itemId 
   */
  async getItemById(itemId) {
    const docSnap = await getDocs(query(collection(db, "inventory"), where("__name__", "==", itemId))); 
    // Note: getDoc(doc(db, "inventory", itemId)) is cleaner/cheaper than query
    // But keeping import consistency. actually let's use getDoc if imported.
    // simpler:
    // const docRef = doc(db, "inventory", itemId);
    // const docSnap = await getDoc(docRef);
    // But I need to import getDoc.
    // Let's stick to getDocs(query) if getDoc isn't imported, OR add import.
    // Looking at line 1: getDocs, addDoc, doc, deleteDoc, updateDoc ARE imported. getDoc is NOT.
    // I will add getDoc to imports first.
    return null; 
  },

  /**
   * Add new item to inventory
   * @param {object} itemData 
   */
  async addItem(itemData) {
    try {
      // Create keywords for search (basic implementation)
      const keywords = itemData.name.toLowerCase().split(' ');
      
      const docRef = await addDoc(collection(db, "inventory"), {
        ...itemData,
        keywords,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
    }
  },

  /**
   * Delete item
   */
  async deleteItem(itemId) {
    await deleteDoc(doc(db, "inventory", itemId));
  },

  /**
   * Update Item
   */
  async updateItem(itemId, data) {
    await updateDoc(doc(db, "inventory", itemId), data);
  },

  // --- POS METHODS ---

  /**
   * Find product by barcode within a specific branch
   * @param {string} barcode 
   * @param {string} branchId
   */
  async getProductByBarcode(barcode, branchId) {
    try {
      // 1. Always try Firebase FIRST when online (ensures fresh data)
      if (navigator.onLine) {
        const q = query(
          collection(db, "inventory"), 
          where("barcode", "==", barcode),
          where("branchId", "==", branchId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const product = { id: docSnap.id, ...docSnap.data() };
          // Update local cache with fresh data
          await localDb.products.put(product);
          return product;
        }
      }

      // 2. Offline fallback: use local DB
      const localProduct = await localDb.products
        .where('barcode').equals(barcode)
        .filter(item => item.branchId === branchId)
        .first();

      if (localProduct) {
        return localProduct;
      }
      
      return null;
    } catch (err) {
      console.error("Error finding product:", err);
      // If Firebase fails, try local DB as last resort
      try {
        const fallback = await localDb.products
          .where('barcode').equals(barcode)
          .filter(item => item.branchId === branchId)
          .first();
        return fallback || null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Get Categories
   */
  async getCategories() {
    // We can store categories globally or per branch. For now, global 'categories' collection.
    const q = query(collection(db, "categories")); 
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Add Category (Prevent Duplicates)
   */
  async addCategory(name) {
    const trimmedName = name.trim();
    // Check if exists
    const q = query(collection(db, "categories"), where("name", "==", trimmedName));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        throw new Error("Category already exists");
    }

    const docRef = await addDoc(collection(db, "categories"), {
       name: trimmedName,
       count: 0
    });
    return { id: docRef.id, name: trimmedName };
  },

  /**
   * Delete Category
   */
  async deleteCategory(categoryId) {
    await deleteDoc(doc(db, "categories", categoryId));
  },

  /**
   * Process Sale (Atomic Stock Update)
   * @param {Array} cartItems 
   */
  async processSale(cartItems) {
    console.log("Processing Sale for items:", cartItems);

    // OFFLINE CHECK
    if (!navigator.onLine) {
        console.log("App is OFFLINE. Skipping Firestore inventory update.");
        // We rely on salesService to save the offline sale record.
        // Optionally: We could update local Dexie stock here if we tracked it precisely.
        return true; 
    }

    // ONLINE LOGIC (Original)
    try {
      // Loop through items and update inventory sequentially to avoid race conditions on same doc
      for (const item of cartItems) {
        if (!item.id) {
            console.error("Item missing ID, skipping:", item);
            continue;
        }

        const itemRef = doc(db, "inventory", item.id);
        const itemSnap = await getDoc(itemRef);
        
        if (itemSnap.exists()) {
          const data = itemSnap.data();
          
          let currentVariants = data.variants || [];
          
          // Fallback if no variants
          if (currentVariants.length === 0) {
             currentVariants = [{ id: Date.now(), color: 'Standard', size: 'One Size', quantity: Number(data.stock) || 0 }];
          }

          // Deduct from the first variant (MVP Logic)
          const qtyToDeduct = Number(item.qty) || 0;
          const currentQty = Number(currentVariants[0].quantity) || 0;
          const newQty = Math.max(0, currentQty - qtyToDeduct);
          
          currentVariants[0].quantity = newQty;

          // Recalculate Total Stock from variants
          const newTotalStock = currentVariants.reduce((acc, v) => acc + (Number(v.quantity) || 0), 0);

          await updateDoc(itemRef, {
            stock: newTotalStock,
            variants: currentVariants
          });
          
          // UPDATE LOCAL DB TOO (Keep it in sync)
          await localDb.products.update(item.id, { 
              stock: newTotalStock,
              variants: currentVariants // Dexie might ignore nested updates depending on schema, but good to try
          });

        } else {
            console.error("Item document not found:", item.id);
        }
      }
      return true;
    } catch (e) {
      console.error("Sale processing error", e);
      throw e;
    }
  },

  /**
   * Recalculate all inventory prices based on current rates
   */
  async recalculateInventoryPrices(rates) {
    try {
      console.log("Starting bulk strict recalculation...");
      const querySnapshot = await getDocs(collection(db, "inventory"));
      let updatedCount = 0;

      const batchSize = 500;
      let batch = [];

      for (const docSnap of querySnapshot.docs) {
        const item = docSnap.data();
        const sellPrice = Number(item.sellPrice);

        if (!isNaN(sellPrice) && sellPrice > 0) {
          const newIQD = Math.round(sellPrice * rates.IQD);
          const newEUR = Number((sellPrice * rates.EUR).toFixed(2));

          // Only update if changed
          if (item.priceIQD !== newIQD || item.priceEUR !== newEUR) {
            batch.push(
               updateDoc(doc(db, "inventory", docSnap.id), {
                priceIQD: newIQD,
                priceEUR: newEUR
              })
            );
            updatedCount++;
          }
        }
      }
      
      await Promise.all(batch);
      console.log(`Updated ${updatedCount} items.`);
      return updatedCount;
    } catch (error) {
      console.error("Recalculation failed", error);
      throw error;
    }
  },

  /**
   * Force refresh inventory from Firebase and update Local DB
   * Solves issue where Local DB has stale prices (72 vs 80000)
   */
  async forceRefreshInventory(branchId) {
    try {
      console.log(`Force refreshing inventory for branch ${branchId}...`);
      
      // 1. Fetch from Firebase (Fresh Data)
      const q = query(
        collection(db, "inventory"), 
        where("branchId", "==", branchId)
      );
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Clear Local DB for this branch to remove stale data
      await localDb.products.where('branchId').equals(branchId).delete();

      // 3. Cache new items
      if (items.length > 0) {
        await cacheInventory(items);
      }

      return items.length;
    } catch (error) {
      console.error("Force refresh failed", error);
      throw error;
    }
  }
};
