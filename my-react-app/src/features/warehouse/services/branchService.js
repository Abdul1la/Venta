import { collection, getDocs, addDoc, Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export const branchService = {
  /**
   * Get all branches
   */
  async getBranches() {
    try {
      const querySnapshot = await getDocs(collection(db, "branches"));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching branches:", error);
      return [];
    }
  },

  /**
   * Add a new branch
   */
  async addBranch(branchConfig) {
    try {
      const docRef = await addDoc(collection(db, "branches"), {
        ...branchConfig,
        createdAt: Timestamp.now(),
        // Initialize stats
        revenue: 0,
        employees: 0
      });
      return { id: docRef.id, ...branchConfig };
    } catch (error) {
      console.error("Error adding branch:", error);
      throw error;
    }
  },

  /**
   * Get payment methods for a branch
   */
  async getPaymentConfig(branchId) {
    try {
        // We use a subcollection 'settings' with doc 'payments'
        // This avoids loading this data when listing all branches
        const snapshot = await getDocs(collection(db, "branches", branchId, "settings"));
        const paymentDoc = snapshot.docs.find(d => d.id === 'payments');
        
        if (paymentDoc) {
            return paymentDoc.data().methods || [];
        }
        
        // Default methods if none configured
        return [
            { id: 'cash', name: 'Cash', icon: '💵', active: true, currency: 'USD' },
            { id: 'card', name: 'Card', icon: '💳', active: true, currency: 'USD' }
        ];
    } catch (error) {
        console.error("Error getting payment config:", error);
        return [];
    }
  },

  /**
   * Update payment config
   */
  async updatePaymentConfig(branchId, methods) {
      try {
          const docRef = doc(db, "branches", branchId, "settings", "payments");
          // setDoc with merge: true handles both create and update
          // We need 'setDoc' imported. Accessing db...
          // I will need to check imports again or just use simple logic if I can.
          // Importing setDoc and doc is required.
          await setDoc(docRef, { methods }, { merge: true });
          return true;
      } catch (error) {
          console.error("Error saving payment config:", error);
          throw error;
      }
  }
};
