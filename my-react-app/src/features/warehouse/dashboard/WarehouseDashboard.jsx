import { TrendingUp, Store, Users, DollarSign, Activity, Plus, ArrowRight, Wallet, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import NotificationBell from '../../../components/ui/NotificationBell';
import { useState, useEffect } from 'react';
import { salesService } from '../../shop/services/salesService';
import { branchService } from '../services/branchService';
import { authService } from '../../auth/services/authService';
import { useTranslation } from 'react-i18next';

// --- MOCK GLOBAL DATA ---
const GLOBAL_SALES_DATA = [
  { name: 'Jan', value: 12000 },
  { name: 'Feb', value: 19000 },
  { name: 'Mar', value: 15000 },
  { name: 'Apr', value: 25000 },
  { name: 'May', value: 22000 },
  { name: 'Jun', value: 30000 },
];

const WarehouseDashboard = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    totalUSD: 0,
    totalIQD: 0,
    totalEUR: 0,
    branches: 0,
    employees: 0,
    expenses: 0
  });
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const loadGlobalData = async () => {
      try {
        const [salesStats, branchesList, employeesList] = await Promise.all([
          salesService.getNetworkStats(),
          branchService.getBranches(),
          authService.getEmployees()
        ]);

        setStats({
          revenue: salesStats.totalRevenue,
          totalUSD: salesStats.totalUSD || 0,
          totalIQD: salesStats.totalIQD || 0,
          totalEUR: salesStats.totalEUR || 0,
          branches: branchesList.length,
          employees: employeesList.length,
          expenses: 0
        });

        const performanceData = salesStats.branchPerformance.map((bp, idx) => {
          const branch = branchesList.find(b => b.id === bp.id);
          const COLORS = ['#007AFF', '#34C759', '#FF9500', '#5856D6', '#FF2D55'];
          return {
            name: branch ? branch.name.split(' ')[0] : 'Unknown',
            sales: bp.value,
            color: COLORS[idx % COLORS.length]
          };
        });
        setBranchPerformance(performanceData);

        const activityData = salesStats.recentActivity.map(sale => ({
          id: sale.id,
          type: t('common.newSale'),
          text: t('common.saleRecorded', { amount: `$${sale.total}` }),
          time: sale.date || 'Today',
          icon: DollarSign,
          color: '#34C759'
        }));
        setRecentActivity(activityData);

      } catch (error) {
        console.error("Dashboard Error", error);
      } finally {
        setLoading(false);
      }
    };
    loadGlobalData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>{t('common.loading')}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}
    >
      {/* HERO HEADER */}
      <motion.div variants={itemVariants} style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            {t('warehouse.dashboard.headquartersOverview')}
          </h2>
          <h1 style={{
            fontSize: '32px', fontWeight: '800', margin: 0,
            background: 'linear-gradient(45deg, var(--color-text-primary), var(--color-text-secondary))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            {t('warehouse.dashboard.ventaNetworkAdmin')}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <NotificationBell />
          <button className="btn btn-primary" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {t('warehouse.dashboard.generateReport')}
          </button>
        </div>
      </motion.div>

      {/* STATS OVERVIEW */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <DashboardStat
          title={t('warehouse.dashboard.totalNetworkRevenue')}
          value={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <div style={{ color: 'white', fontSize: '26px', fontWeight: '800' }}>${(stats.totalUSD || 0).toLocaleString()}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>{(stats.totalIQD || 0).toLocaleString()} IQD</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>€{(stats.totalEUR || 0).toLocaleString()}</div>
            </div>
          }
          change="+0%"
          isPositive
          icon={Wallet}
          mainColor="linear-gradient(135deg, #007AFF, #0056B3)"
          textColor="#FFF"
          dark
        />

        <DashboardStat
          title={t('warehouse.dashboard.activeBranches')}
          value={stats.branches}
          subtext={t('common.locations', 'Locations')}
          icon={Store}
          mainColor="var(--color-bg-card)"
          textColor="var(--color-text-primary)"
        />
        <DashboardStat
          title={t('warehouse.dashboard.totalEmployees')}
          value={stats.employees}
          subtext={t('common.active', 'Active Staff')}
          icon={Users}
          mainColor="var(--color-bg-card)"
          textColor="var(--color-text-primary)"
        />
        <DashboardStat
          title={t('warehouse.dashboard.monthlyExpenses')}
          value="$0"
          change="0%"
          isPositive={true}
          icon={Activity}
          mainColor="var(--color-bg-card)"
          textColor="var(--color-text-primary)"
        />
      </motion.div>

      {/* ANALYTICS SECTION */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '40px' }}>
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{t('warehouse.dashboard.globalPerformance')}</h3>
              <p style={{ margin: '4px 0 0', color: '#999', fontSize: '13px' }}>{t('warehouse.dashboard.aggregatedSales')}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'var(--color-bg-app)', borderRadius: '20px', color: 'var(--color-text-secondary)' }}>6 {t('common.months_plural', 'Months')}</span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GLOBAL_SALES_DATA}>
                <defs>
                  <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#111" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--color-bg-card)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', color: 'var(--color-text-primary)' }}
                  cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorGlobal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', minHeight: '400px', display: 'flex', flexDirection: 'column', textAlign: isRtl ? 'right' : 'left' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>{t('warehouse.dashboard.topBranches')}</h3>
          <p style={{ margin: '0 0 24px', color: '#999', fontSize: '13px' }}>{t('warehouse.dashboard.salesByLocation')}</p>

          <div style={{ flex: 1, width: '100%' }}>
            {branchPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={branchPerformance} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 13, fontWeight: 500 }} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
                    {branchPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CCC', fontSize: '13px' }}>
                {t('common.noData')}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.revenue')}</span>
                {branchPerformance.length > 0 && <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{branchPerformance[0].name} (${branchPerformance[0].sales})</span>}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RECENT ACTIVITY & ACTIONS */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('warehouse.dashboard.recentUpdates')}</h3>
            <button className="btn" style={{ padding: '4px 12px', fontSize: '12px' }}>{t('common.viewDetails')}</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {recentActivity.length > 0 ? recentActivity.map(act => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${act.color}15`, color: act.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <act.icon size={20} />
                </div>
                <div style={{ flex: 1, textAlign: isRtl ? 'right' : 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{act.type}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{act.text}</div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{act.time}</span>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#CCC', fontSize: '13px' }}>
                {t('common.noData')}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ textAlign: isRtl ? 'right' : 'left' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>{t('warehouse.dashboard.quickActions')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <button
              onClick={() => navigate('/warehouse/branches')}
              className="card"
              style={{
                padding: '24px', border: 'none', cursor: 'pointer', textAlign: isRtl ? 'right' : 'left',
                background: 'linear-gradient(135deg, #007AFF, #0056B3)', color: '#FFF',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px'
              }}
            >
              <div style={{ background: 'rgba(255,255,255,0.2)', width: 'fit-content', padding: '8px', borderRadius: '8px', alignSelf: isRtl ? 'flex-end' : 'flex-start' }}>
                <Store size={24} />
              </div>
              <div>
                <div style={{ opacity: 0.8, fontSize: '12px' }}>{t('warehouse.dashboard.networkGrowth')}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{t('warehouse.dashboard.addBranch')}</div>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const DashboardStat = ({ title, value, change, subtext, icon: Icon, mainColor, textColor, isPositive, dark }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="card"
      style={{
        padding: '24px', background: mainColor, color: textColor, border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        borderRadius: 'var(--radius-lg)',
        boxShadow: mainColor.includes('linear-gradient') ? '0 10px 30px rgba(0,102,204,0.3)' : 'var(--shadow-sm)',
        textAlign: isRtl ? 'right' : 'left',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          background: dark ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-secondary)',
          color: dark ? '#FFF' : 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={22} />
        </div>
        {change && (
          <span style={{
            fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '20px',
            background: isPositive ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
            color: isPositive ? 'var(--color-success)' : 'var(--color-error)',
            border: '1px solid var(--color-border)'
          }}>
            {change}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: '13px', opacity: 0.6, fontWeight: 500, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</div>
        {subtext && <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>{subtext}</div>}
      </div>
    </motion.div>
  );
};

export default WarehouseDashboard;
