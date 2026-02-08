import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export const ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
};

export const ACCESS_TYPES = {
  SALES: "sales",
  INVENTORY: "inventory",
  REPORTS: "reports",
};

export const authService = {
  /**
   * Real Firestore Sign In
   * Queries 'admins' collection for matching username and password.
   */
  async signIn(username, password) {
    try {
      if (!username || !password) throw new Error("Credentials required");

      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
         throw new Error("User not found");
      }

      let foundUser = null;
      
      // Client-side password check
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Simple string comparison for now as per user instruction
        if (userData.password === password) {
            foundUser = { id: doc.id, ...userData };
        }
      });

      if (!foundUser) {
        throw new Error("Invalid password");
      }
      
      // Normalize Role: If it's the main admin manual entry, ensure it has Admin Role
      if (foundUser.username === 'admin' && !foundUser.role) {
          foundUser.role = ROLES.ADMIN;
      }

      return foundUser;

    } catch (error) {
      console.error("Auth Error:", error);
      throw error;
    }
  },

  /**
   * Create New Employee
   * Adds a new document to 'admins' collection
   */
  async createEmployee(employeeData) {
      try {
          // Check if username exists
          const adminsRef = collection(db, "admins");
          const q = query(adminsRef, where("username", "==", employeeData.username));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
              throw new Error("Username already exists");
          }

          const newDocRef = doc(collection(db, "admins")); // Auto-ID
          await setDoc(newDocRef, {
              ...employeeData,
              role: ROLES.EMPLOYEE, // Force employee role
              createdAt: new Date().toISOString()
          });
          
          return newDocRef.id;
      } catch (error) {
          console.error("Create Employee Error:", error);
          throw error;
      }
  },
  
  /**
   * Get All Employees (for management view)
   */
  async getEmployees() {
      const q = query(collection(db, "admins"), where("role", "==", ROLES.EMPLOYEE));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Get All Staff (Admins + Employees) for name lookup
   */
  async getAllStaff() {
      const q = query(collection(db, "admins"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Delete Employee
   */
  async deleteEmployee(id) {
      try {
          await deleteDoc(doc(db, "admins", id));
          return true;
      } catch (error) {
          console.error("Delete Employee Error:", error);
          throw error;
      }
  },

  /**
   * Update Admin Details (Username/Password)
   */
  async updateAdmin(id, data) {
    try {
      const adminRef = doc(db, "admins", id);
      
      // If username is being changed, check if it's already taken
      if (data.username) {
        const adminsRef = collection(db, "admins");
        const q = query(adminsRef, where("username", "==", data.username));
        const snapshot = await getDocs(q);
        
        const alreadyExists = snapshot.docs.some(doc => doc.id !== id);
        if (alreadyExists) {
          throw new Error("Username already taken by another user");
        }
      }

      await setDoc(adminRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error("Update Admin Error:", error);
      throw error;
    }
  }
};
