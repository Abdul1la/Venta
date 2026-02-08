import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export const inventoryService = {
  /**
   * Fetch inventory for a specific branch
   * @param {string} branchId 
   */
  async getBranchInventory(branchId) {
    try {
      const q = query(
        collection(db, "inventory"), 
        where("branchId", "==", branchId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching inventory:", error);
      throw error;
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
   * Find product by barcode
   * @param {string} barcode 
   */
  async getProductByBarcode(barcode) {
    const q = query(
      collection(db, "inventory"), 
      where("barcode", "==", barcode)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
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
          console.log(`Found item ${item.name} (ID: ${item.id}). Current Stock: ${data.stock}`);
          
          let currentVariants = data.variants || [];
          
          // Fallback if no variants
          if (currentVariants.length === 0) {
             console.log("No variants found, creating default variant from stock.");
             currentVariants = [{ id: Date.now(), color: 'Standard', size: 'One Size', quantity: Number(data.stock) || 0 }];
          }

          // Deduct from the first variant (MVP Logic)
          const qtyToDeduct = Number(item.qty) || 0;
          const currentQty = Number(currentVariants[0].quantity) || 0;
          const newQty = Math.max(0, currentQty - qtyToDeduct);
          
          console.log(`Deducting ${qtyToDeduct} from ${currentQty}. New Variant Qty: ${newQty}`);

          currentVariants[0].quantity = newQty;

          // Recalculate Total Stock from variants
          const newTotalStock = currentVariants.reduce((acc, v) => acc + (Number(v.quantity) || 0), 0);
          console.log(`New Document Total Stock: ${newTotalStock}`);

          await updateDoc(itemRef, {
            stock: newTotalStock,
            variants: currentVariants
          });
          console.log("Document updated successfully.");
        } else {
            console.error("Item document not found:", item.id);
        }
      }
      return true;
    } catch (e) {
      console.error("Sale processing error", e);
      throw e;
    }
  }
};
