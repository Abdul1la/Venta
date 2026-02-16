import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const SETTINGS_DOC_ID = "global";
const SETTINGS_COLLECTION = "settings";

const DEFAULT_RATES = {
  USD: 1,
  IQD: 1500,
  EUR: 0.92
};

export const settingsService = {
  /**
   * Get global exchange rates
   */
  async getExchangeRates() {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data().exchangeRates || DEFAULT_RATES;
      } else {
        // Initialize if not exists
        await setDoc(docRef, { exchangeRates: DEFAULT_RATES });
        return DEFAULT_RATES;
      }
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      return DEFAULT_RATES;
    }
  },

  /**
   * Update global exchange rates
   */
  async updateExchangeRates(newRates) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      await updateDoc(docRef, { 
        exchangeRates: newRates,
        lastUpdated: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error("Error updating exchange rates:", error);
      throw error;
    }
  },

  /**
   * Listen to exchange rate changes in real-time
   */
  onExchangeRatesChange(callback) {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().exchangeRates || DEFAULT_RATES);
      } else {
        callback(DEFAULT_RATES);
      }
    });
  }
};
