import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../components/ui/ThemeContext';

const ShopLayout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();

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
            <div style={{ padding: '8px', background: 'var(--color-primary)', color: 'white', borderRadius: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>V</span>
            </div>
          ) : (
            <span style={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px' }}>VENTA POS</span>
          )}
        </div>

        <nav style={{ flex: 1 }}>
          <NavItem to="/shop" icon={ShoppingCart} label={t('shop.nav.register')} />
          <NavItem to="/shop/history" icon={Clock} label={t('shop.nav.history')} />
        </nav>

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
