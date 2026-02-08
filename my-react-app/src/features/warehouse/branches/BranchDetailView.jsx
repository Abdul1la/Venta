import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Plus, Users, Package, Activity, CreditCard, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

import { branchService } from '../services/branchService';
import { salesService } from '../../shop/services/salesService';
import { inventoryService } from '../inventory/inventoryService';
import { authService } from '../../auth/services/authService';
import { useTranslation } from 'react-i18next';

// --- MOCK DATA FOR CHARTS ---
const SALES_DATA = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 5000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 6390 },
  { name: 'Sun', sales: 3490 },
];

const CATEGORY_DATA = [
  { name: 'Suits', value: 400, color: '#0088FE' },
  { name: 'Shoes', value: 300, color: '#00C49F' },
  { name: 'Shirts', value: 300, color: '#FFBB28' },
  { name: 'Access.', value: 200, color: '#FF8042' },
];

import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../auth/services/authService';

// ...

const BranchDetailView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'admin'; // Or ROLES.ADMIN if available

  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    stock: 0,
    employees: 0
  });

  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // 1. Load Branch Info
        const branches = await branchService.getBranches();
        const found = branches.find(b => b.id.toString() === branchId) || { name: 'Unknown Branch', id: branchId };
        setBranch(found);

        // 2. Load Sales Stats (Revenue & Orders & Chart)
        const salesData = await salesService.getBranchStats(branchId);
        setChartData(salesData.chartData); // Real Sales Data

        // 3. Load Inventory Stats (Stock Count & Category Split)
        const inventory = await inventoryService.getBranchInventory(branchId);
        const totalStock = inventory.reduce((acc, item) => acc + (Number(item.stock) || 0), 0);

        // Compute Category Split
        const catMap = {};
        inventory.forEach(item => {
          const cat = item.category || 'Uncategorized';
          catMap[cat] = (catMap[cat] || 0) + (Number(item.stock) || 0);
        });

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
        const activeCategories = Object.keys(catMap).map((cat, idx) => ({
          name: cat,
          value: catMap[cat],
          color: COLORS[idx % COLORS.length]
        }));
        setCategoryData(activeCategories);

        // 4. Load Employee Stats
        const employees = await authService.getEmployees();

        setStats({
          revenue: salesData.totalRevenue,
          orders: salesData.orderCount,
          stock: totalStock,
          employees: employees.length
        });

      } catch (error) {
        console.error("Dashboard Load Error", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [branchId]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>;

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}
    >
      {/* HEADER */}
      <motion.div
        variants={itemVariants}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/warehouse/branches')}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--color-text-primary)'
            }}
          >
            <ArrowLeft size={20} color="var(--color-text-primary)" />
          </button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>
              {branch.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-status-success)' }}></span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('warehouse.branches.detail.liveStatus')}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" style={{ background: 'var(--color-bg-secondary)', fontWeight: 600 }}>
            {t('warehouse.branches.detail.exportReport')}
          </button>
        </div>
      </motion.div>

      {/* STATS ROW */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StatCard title={t('warehouse.branches.detail.totalRevenue')} value={`$${stats.revenue.toLocaleString()}`} trend="+0%" icon={DollarSign} color="var(--color-chart-green)" />
        <StatCard title={t('warehouse.branches.detail.activeOrders')} value={stats.orders} trend="+0%" icon={ShoppingBag} color="var(--color-chart-blue)" />
        <StatCard title={t('warehouse.branches.detail.totalStock')} value={stats.stock} trend={t('warehouse.inventory.title', 'Items')} icon={Package} color="var(--color-chart-orange)" />
        <StatCard title={t('warehouse.branches.detail.employees')} value={stats.employees} trend={t('common.active', 'Active')} icon={Users} color="var(--color-chart-purple)" />
      </motion.div>

      {/* CHARTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>

        {/* Main Sales Chart */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.salesAnalytics')}</h3>
            <select style={{ border: 'none', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              <option>{t('common.months', { returnObjects: true })[0]}</option>
            </select>
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-blue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-chart-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: 'var(--color-chart-blue)', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--color-chart-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Pie Chart */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700 }}>{t('warehouse.branches.detail.categorySplit')}</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-placeholder)' }}>
                No items in inventory
              </div>
            )}

            {/* Center Text Overlay */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -65%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{stats.stock}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('warehouse.inventory.title', 'Items')}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>{t('warehouse.branches.detail.managementHub')}</h3>
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>

        {/* Inventory - Available to Inventory or Admin */}
        {(isAdmin || hasPermission('INVENTORY_WRITE')) && (
          <ActionTile
            title={t('warehouse.branches.detail.stockInventory')}
            subtitle={t('warehouse.branches.detail.manageItems')}
            icon={Package}
            color="#000"
            dark
            onClick={() => navigate(`/warehouse/branches/${branchId}/inventory`)}
          />
        )}

        {/* Transactions - Available to Reports or Admin */}
        {(isAdmin || hasPermission('REPORTS_VIEW')) && (
          <>
            <ActionTile
              title={t('warehouse.branches.detail.viewTransactions')}
              subtitle={t('warehouse.branches.detail.salesLogs')}
              icon={Activity}
              color="#007AFF"
              onClick={() => navigate(`/warehouse/branches/${branchId}/actions`)}
            />

            <ActionTile
              title={t('warehouse.branches.detail.salesHistory')}
              subtitle={t('warehouse.branches.detail.viewTransactions')}
              icon={TrendingUp}
              color="#34C759"
              onClick={() => navigate(`/warehouse/branches/${branchId}/sales?tab=sales`)}
            />

            <ActionTile
              title={t('warehouse.branches.detail.expenses')}
              subtitle={t('warehouse.branches.detail.billsAndCosts')}
              icon={Activity}
              color="#FF3B30"
              onClick={() => navigate(`/warehouse/branches/${branchId}/sales?tab=expenses`)}
            />

            <ActionTile
              title={t('warehouse.branches.monthlyReceipts')}
              subtitle={t('warehouse.branches.reports')}
              icon={Calendar}
              color="#5856D6"
              onClick={() => navigate(`/warehouse/branches/${branchId}/monthly-receipts`)}
            />
          </>
        )}

        {/* Payment Methods - Admin Only (Configuration) */}
        {isAdmin && (
          <ActionTile
            title={t('warehouse.branches.detail.paymentMethods')}
            subtitle="Cash, Visa, etc."
            icon={CreditCard}
            color="#FF9500"
            onClick={() => navigate(`/warehouse/branches/${branchId}/payments`)}
          />
        )}

        {/* Categories - Inventory Write or Admin */}
        {(isAdmin || hasPermission('INVENTORY_WRITE')) && (
          <ActionTile
            title={t('warehouse.inventory.categories')}
            subtitle={t('warehouse.branches.detail.manageItems')}
            icon={Package}
            color="#FF9500"
            onClick={() => navigate(`/warehouse/branches/${branchId}/categories`)}
          />
        )}

        {/* Employees - Admin Only */}
        {isAdmin && (
          <ActionTile
            title={t('warehouse.branches.detail.staffAccess')}
            subtitle={t('warehouse.branches.employees')}
            icon={Users}
            color="#5856D6"
            onClick={() => navigate(`/warehouse/branches/${branchId}/employees`)}
          />
        )}

      </motion.div>

    </motion.div>
  );
};

// --- SUB COMPONENTS ---

const StatCard = ({ title, value, trend, icon: Icon, color }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="card"
    style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `4px solid ${color}` }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
      <div style={{ padding: '10px', background: 'var(--color-bg-secondary)', borderRadius: '12px', color: color }}>
        <Icon size={24} />
      </div>
      <span style={{
        fontSize: '12px', fontWeight: 600,
        padding: '4px 8px', borderRadius: '20px',
        background: trend.includes('+') ? 'var(--color-success-bg)' : 'var(--color-bg-secondary)',
        color: trend.includes('+') ? 'var(--color-success)' : 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)'
      }}>
        {trend}
      </span>
    </div>
    <div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  </motion.div>
);

const ActionTile = ({ title, subtitle, icon: Icon, color, dark, onClick }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        border: 'none',
        background: dark ? '#1C1C1E' : 'var(--color-bg-card)',
        color: dark ? '#FFF' : 'var(--color-text-primary)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        textAlign: isRtl ? 'right' : 'left',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', height: '100%',
        justifyContent: 'space-between'
      }}
    >
      <div style={{
        alignSelf: isRtl ? 'flex-end' : 'flex-start',
        padding: '12px',
        background: dark ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        color: dark ? '#FFF' : color,
        marginBottom: '24px'
      }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', textAlign: isRtl ? 'right' : 'left' }}>{title}</div>
        <div style={{ fontSize: '13px', opacity: 0.7, textAlign: isRtl ? 'right' : 'left' }}>{subtitle}</div>
      </div>
    </motion.button>
  );
};

export default BranchDetailView;
