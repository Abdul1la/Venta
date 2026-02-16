import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, LogOut, Menu, Sun, Moon, DollarSign, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../components/ui/ThemeContext';
import { settingsService } from '../common/services/settingsService';
import { useNotification } from '../../components/ui/NotificationContext';

const ShopLayout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { showNotification } = useNotification();
  
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, IQD: 1500, EUR: 0.92 });
  const [localRate, setLocalRate] = useState(1500);
  const [updatingRate, setUpdatingRate] = useState(false);

  useEffect(() => {
     // Listen for changes or fetch initial
     const unsubscribe = settingsService.onExchangeRatesChange((rates) => {
        setExchangeRates(rates);
        setLocalRate(rates.IQD);
     });
     return () => unsubscribe();
  }, []);

  const handleUpdateRate = async () => {
    setUpdatingRate(true);
    try {
      let rateToSave = Number(localRate);
      
      // AUTO-DETECTION: If the user enters a large number (like 150,000), 
      // assume they mean price for $100 and divide by 100.
      if (rateToSave >= 10000) {
        rateToSave = rateToSave / 100;
      }

      await settingsService.updateExchangeRates({ ...exchangeRates, IQD: rateToSave });
      showNotification(t('shop.nav.rateUpdated', 'Rate Updated'), 'success');
      setLocalRate(rateToSave); // Sync back to display the normalized rate
    } catch (err) {
      showNotification(t('shop.nav.rateError', 'Failed to update rate'), 'error');
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `btn ${isActive ? 'active' : ''}`}
      style={({ isActive }) => ({
        width: '100%',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 16px',
        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: isActive ? '#FFF' : 'rgba(255,255,255,0.6)',
        marginBottom: '8px',
        borderRadius: '12px',
        transition: 'all 0.2s',
        border: isActive ? '1px solid rgba(255,255,255,0.2)' : 'none'
      })}
    >
      <Icon size={24} />
      {!collapsed && <span style={{ marginLeft: '12px', fontWeight: 600 }}>{label}</span>}
    </NavLink>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'row', overflow: 'hidden', background: 'var(--color-bg-app)' }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? '80px' : '200px',
        background: 'var(--color-bg-card)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        transition: 'width 0.3s ease',
        zIndex: 50
      }}>
        {/* Toggle / Brand */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '32px', cursor: 'pointer', color: 'var(--color-text-primary)'
          }}
        >
          {collapsed ? (
            <div style={{ padding: '6px' }}>
              <img src="/Venta.png" alt="MAX" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ padding: '0 8px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <img 
                src="/VentaWithoutBackground.png" 
                alt="MAX POS" 
                style={{ 
                  height: '50px', 
                  objectFit: 'contain', 
                  maxWidth: '100%',
                  filter: isDarkMode ? 'invert(1)' : 'none',
                  mixBlendMode: isDarkMode ? 'screen' : 'multiply'
                }} 
              />
            </div>
          )}
        </div>

        <nav style={{ flex: 1 }}>
          <NavItem to="/shop" icon={ShoppingCart} label={t('shop.nav.register')} />
          <NavItem to="/shop/history" icon={Clock} label={t('shop.nav.history')} />
        </nav>

        {/* Exchange Rate Sidebar Widget */}
        <div style={{ 
          marginBottom: '20px', 
          padding: collapsed ? '0' : '16px', 
          background: collapsed ? 'transparent' : 'rgba(255,255,255,0.03)', 
          borderRadius: '16px',
          border: collapsed ? 'none' : '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
           {collapsed ? (
              <div 
                onClick={() => setCollapsed(false)}
                style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759', cursor: 'pointer' }}
              >
                <DollarSign size={20} />
              </div>
           ) : (
             <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('common.usdRate')}</span>
                  <button 
                    onClick={handleUpdateRate} 
                    disabled={updatingRate}
                    style={{ background: 'transparent', border: 'none', color: '#34C759', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    {updatingRate ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
               </div>
               <div style={{ position: 'relative' }}>
                  <input 
                    type="number"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    style={{ 
                      width: '100%', background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', 
                      borderRadius: '8px', padding: '8px 8px 8px 30px', color: 'var(--color-text-primary)', 
                      fontSize: '14px', fontWeight: 700, outline: 'none' 
                    }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#34C759', fontWeight: 700, fontSize: '13px' }}>$</span>
               </div>
             </>
           )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            width: '100%', height: '50px', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px', marginBottom: '8px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary)'
          }}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          {!collapsed && <span style={{ marginLeft: '12px', fontWeight: 600 }}>{isDarkMode ? t('common.lightMode', 'Light Mode') : t('common.darkMode', 'Dark Mode')}</span>}
        </button>

        <button
          onClick={handleLogout}
          className="btn"
          style={{
            color: 'var(--color-error)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            height: '50px',
            background: 'transparent'
          }}
        >
          <LogOut size={24} />
          {!collapsed && <span style={{ marginLeft: '12px' }}>{t('auth.signOut')}</span>}
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--color-bg-app)' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ShopLayout;
