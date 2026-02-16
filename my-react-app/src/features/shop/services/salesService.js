import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { saveOfflineSale } from "../../../lib/db";

// Exchange rates (base: USD) - Update these as needed
const EXCHANGE_RATES = {
  USD: 1,
  IQD: 1460,     // 1 USD = 1460 IQD
  EUR: 0.92      // 1 USD = 0.92 EUR
};

// Convert amount from one currency to another
const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  // Convert to USD first, then to target currency
  const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
  return amountInUSD * EXCHANGE_RATES[toCurrency];
};

export const salesService = {
  /**
   * Create a new sale record with amounts in all currencies
   * @param {Object} saleData - Data for the sale
   * @param {Object} rates - Optional exchange rates {USD, IQD, EUR}
   */
  async createSale(saleData, rates = EXCHANGE_RATES) {
    try {
      // OFFLINE HANDLING
      if (!navigator.onLine) {
         console.log("App is OFFLINE. Saving sale to Local DB.");
         const offlineId = await saveOfflineSale({
            ...saleData,
            // Add default exchange values for consistency
            totalUSD: saleData.currency === 'USD' ? saleData.total : 0, 
            createdAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
         });
         return `offline_${offlineId}`;
      }

      const originalCurrency = saleData.currency || 'USD';
      const originalAmount = Number(saleData.total) || 0;
      
      // Helper function with dynamic rates
      const localConvert = (amt, from, to) => {
        if (from === to) return amt;
        const inUSD = amt / rates[from];
        return inUSD * rates[to];
      };

      // Calculate amounts in all three currencies
      const totalUSD = localConvert(originalAmount, originalCurrency, 'USD');
      const totalIQD = localConvert(originalAmount, originalCurrency, 'IQD');
      const totalEUR = localConvert(originalAmount, originalCurrency, 'EUR');
      
      const docRef = await addDoc(collection(db, "sales"), {
        ...saleData,
        // Store original values
        total: originalAmount,
        currency: originalCurrency,
        // Store converted amounts for all currencies
        totalUSD: Math.round(totalUSD * 100) / 100,
        totalIQD: Math.round(totalIQD),
        totalEUR: Math.round(totalEUR * 100) / 100,
        createdAt: Timestamp.now(),
        date: new Date().toISOString().split('T')[0] // For easy date filtering
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating sale:", error);
      
      // If error is network related (e.g. Firebase offline throws), fallback to local
      if (error.code === 'unavailable' || !navigator.onLine) {
         console.log("Network unavailable. Fallback to Local DB.");
         const offlineId = await saveOfflineSale({
            ...saleData,
            createdAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
         });
         return `offline_${offlineId}`;
      }
      
      throw error;
    }
  },

  /**
   * Get stats for a branch (Revenue, Order Count)
   */
  async getBranchStats(branchId) {
    try {
      // In a real app with huge data, we would use Aggregation Queries or Cloud Functions
      // For MVP, client-side aggregation is acceptable for small datasets.
      
      console.log(`[getBranchStats] Fetching sales for branchId: "${branchId}"`);
      const q = query(collection(db, "sales"), where("branchId", "==", branchId));
      const snapshot = await getDocs(q);
      
      console.log(`[getBranchStats] Found ${snapshot.size} sales records.`);

      let totalUSD = 0;
      let totalIQD = 0;
      let totalEUR = 0;
      let orderCount = 0;
      let weeklyData = {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.totalUSD !== undefined) {
          totalUSD += Number(data.totalUSD) || 0;
          totalIQD += Number(data.totalIQD) || 0;
          totalEUR += Number(data.totalEUR) || 0;
        } else {
          // Fallback for older records
          const amount = Number(data.total) || 0;
          const currency = data.currency || 'USD';
          if (currency === 'USD') {
            totalUSD += amount;
            totalIQD += amount * rates.IQD;
            totalEUR += amount * rates.EUR;
          } else if (currency === 'IQD') {
            totalIQD += amount;
            totalUSD += amount / rates.IQD;
            totalEUR += (amount / rates.IQD) * rates.EUR;
          } else if (currency === 'EUR') {
            totalEUR += amount;
            totalUSD += amount / rates.EUR;
            totalIQD += (amount / rates.EUR) * rates.IQD;
          }
        }
        
        orderCount++;
        
        // Date Aggregation for chart (using totalUSD for consistent weighting)
        const saleDate = data.date; // YYYY-MM-DD
        if (saleDate && new Date(saleDate) >= sevenDaysAgo) {
            weeklyData[saleDate] = (weeklyData[saleDate] || 0) + (data.totalUSD !== undefined ? Number(data.totalUSD) : Number(data.total) || 0);
        }
      });
      
      console.log(`[getBranchStats] Calculated Revenue - USD: ${totalUSD}, IQD: ${totalIQD}`);

      // Format for Recharts (Last 7 Days)
      const chartData = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const dayName = days[d.getDay()];
          
          chartData.push({
              name: dayName,
              sales: weeklyData[dateStr] || 0
          });
      }

      return {
        totalRevenue: totalIQD, // Main revenue now in IQD as requested
        totalUSD,
        totalIQD,
        totalEUR,
        orderCount,
        recentSales: snapshot.docs.slice(0, 5).map(d => ({id: d.id, ...d.data()})),
        chartData
      };
    } catch (error) {
      console.error("Error fetching branch stats:", error);
      return { totalRevenue: 0, orderCount: 0, recentSales: [] };
    }
  },
  async getBranchSales(branchId) {
    try {
      console.log(`[getBranchSales] Fetching all sales for branchId: "${branchId}"`);
      // NOTE: Removed orderBy("createdAt", "desc") to avoid needing a Firestore Composite Index
      const q = query(
        collection(db, "sales"), 
        where("branchId", "==", branchId)
      );
      const snapshot = await getDocs(q);
      console.log(`[getBranchSales] Found ${snapshot.size} sales.`);
      
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory (newest first)
      return sales.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
      });
    } catch (error) {
      console.error("Error fetching branch sales:", error);
      return [];
    }
  },

  /**
   * Get monthly sales for a branch with daily breakdown
   * @param {string} branchId - Branch ID
   * @param {number} year - Year (e.g., 2026)
   * @param {number} month - Month (1-12)
   */
  async getMonthlySales(branchId, year, month) {
    try {
      console.log(`[getMonthlySales] Fetching for branch: ${branchId}, ${year}-${month}`);
      
      // Get all sales for the branch
      const q = query(
        collection(db, "sales"),
        where("branchId", "==", branchId)
      );
      const snapshot = await getDocs(q);
      
      // Filter by month/year and aggregate
      const dailyData = {};
      let totalUSD = 0, totalIQD = 0, totalEUR = 0;
      let salesCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const saleDate = data.createdAt?.toDate ? data.createdAt.toDate() : (data.date ? new Date(data.date) : null);
        
        if (!saleDate) return;
        
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth() + 1; // 1-indexed
        
        if (saleYear !== year || saleMonth !== month) return;
        
        salesCount++;
        const dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const amount = Number(data.total) || 0;
        const currency = data.currency || 'USD';
        
        // Initialize daily entry
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { date: dateKey, count: 0, USD: 0, IQD: 0, EUR: 0 };
        }
        
        dailyData[dateKey].count++;
        
        // Add to daily and total by currency
        if (currency === 'USD') {
          dailyData[dateKey].USD += amount;
          totalUSD += amount;
        } else if (currency === 'IQD' || currency === 'ID') {
          dailyData[dateKey].IQD += amount;
          totalIQD += amount;
        } else if (currency === 'EUR') {
          dailyData[dateKey].EUR += amount;
          totalEUR += amount;
        }
      });
      
      // Convert to sorted array
      const dailyBreakdown = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        year,
        month,
        salesCount,
        totalUSD,
        totalIQD,
        totalEUR,
        dailyBreakdown
      };
    } catch (error) {
      console.error("Error fetching monthly sales:", error);
      return { year, month, salesCount: 0, totalUSD: 0, totalIQD: 0, totalEUR: 0, dailyBreakdown: [] };
    }
  },

  /**
   * Get global stats for the entire network
   */
  async getNetworkStats() {
    try {
      const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      let totalUSD = 0;
      let totalIQD = 0;
      let totalEUR = 0;
      let branchSales = {}; // { branchId: amountInUSD }

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Use stored currency values if available (new format)
        if (data.totalUSD !== undefined) {
          totalUSD += Number(data.totalUSD) || 0;
          totalIQD += Number(data.totalIQD) || 0;
          totalEUR += Number(data.totalEUR) || 0;
        } else {
          // Fallback for old records: use original currency
          const amount = Number(data.total) || 0;
          const currency = data.currency || 'USD';
          
          if (currency === 'USD') {
            totalUSD += amount;
            totalIQD += amount * EXCHANGE_RATES.IQD;
            totalEUR += amount * EXCHANGE_RATES.EUR;
          } else if (currency === 'IQD' || currency === 'ID') {
            totalIQD += amount;
            totalUSD += amount / EXCHANGE_RATES.IQD;
            totalEUR += (amount / EXCHANGE_RATES.IQD) * EXCHANGE_RATES.EUR;
          } else if (currency === 'EUR') {
            totalEUR += amount;
            totalUSD += amount / EXCHANGE_RATES.EUR;
            totalIQD += (amount / EXCHANGE_RATES.EUR) * EXCHANGE_RATES.IQD;
          }
        }
        
        // Aggregate by branch (always use USD for chart)
        const bid = data.branchId || 'unknown';
        const usdAmount = data.totalUSD !== undefined ? Number(data.totalUSD) : Number(data.total) || 0;
        branchSales[bid] = (branchSales[bid] || 0) + usdAmount;
      });

      // Convert branchSales to array (filter out 'unknown' branch)
      const branchPerformance = Object.keys(branchSales)
        .filter(bid => bid !== 'unknown')
        .map(bid => ({
          id: bid,
          value: Math.round(branchSales[bid] * 100) / 100
        }));

      return {
        totalRevenue: Math.round(totalUSD * 100) / 100,
        totalUSD: Math.round(totalUSD * 100) / 100,
        totalIQD: Math.round(totalIQD),
        totalEUR: Math.round(totalEUR * 100) / 100,
        orderCount: snapshot.size,
        branchPerformance,
        recentActivity: snapshot.docs.slice(0, 5).map(d => ({id: d.id, ...d.data()}))
      };
    } catch (error) {
      console.error("Error fetching network stats:", error);
      return { totalRevenue: 0, totalUSD: 0, totalIQD: 0, totalEUR: 0, orderCount: 0, branchPerformance: [], recentActivity: [] };
    }
  }
};
