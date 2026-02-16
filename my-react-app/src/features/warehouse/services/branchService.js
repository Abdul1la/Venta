import { collection, getDocs, addDoc, Timestamp, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
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
   * Delete a branch and all associated data (Cascade Delete)
   */
  async deleteBranch(branchId) {
    try {
      console.log(`[deleteBranch] Starting cascading delete for branch: ${branchId}`);

      // 1. Delete all Sales for this branch
      const salesQuery = query(collection(db, "sales"), where("branchId", "==", branchId));
      const salesSnapshot = await getDocs(salesQuery);
      const salesDeletes = salesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(salesDeletes);
      console.log(`[deleteBranch] Deleted ${salesDeletes.length} sales records.`);

      // 2. Delete all Employees for this branch
      // access 'admins' collection where branchId == branchId
      // Note: We should strictly filter by role 'employee' if needed, but usually only employees have branchId.
      const employeesQuery = query(collection(db, "admins"), where("branchId", "==", branchId));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeeDeletes = employeesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(employeeDeletes);
      console.log(`[deleteBranch] Deleted ${employeeDeletes.length} employees.`);

      // 3. Delete Branch Settings (Payments)
      // Note: Subcollections are not automatically deleted in Firestore, so we must allow specific known paths
      try {
        await deleteDoc(doc(db, "branches", branchId, "settings", "payments"));
      } catch (e) {
        console.warn("No settings/payments doc found or error deleting it", e);
      }

      // 4. Delete the Branch Document itself
      await deleteDoc(doc(db, "branches", branchId));
      console.log(`[deleteBranch] Branch document deleted.`);

      return true;
    } catch (error) {
      console.error("Error deleting branch command:", error);
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
