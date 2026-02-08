import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService, ROLES } from '../services/authService';
import { useAuth } from '../AuthContext';
import { Lock, User, Terminal, ArrowRight } from 'lucide-react';

const LoginView = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth(); // Use Context
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(ROLES.ADMIN); 

  // Track mount status...
  let mounted = true; 

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!username || !password) {
        throw new Error(t('auth.errors.missingCredentials'));
      }

      const user = await authService.signIn(username, password);
      console.log('Login successful:', user);
      
      // STORE IN CONTEXT
      login(user);
      
      // Navigate based on role
      // Navigate based on role & permissions
      const hasWarehouseAccess = user.role === ROLES.ADMIN || 
                                 (user.permissions && (user.permissions.includes('INVENTORY_WRITE') || user.permissions.includes('REPORTS_VIEW')));

      // If user selected "Shop" tab AND has POS access, let them go there. 
      // Otherwise, default to highest privilege (Warehouse)
      if (activeTab === ROLES.EMPLOYEE && user.permissions?.includes('POS_ACCESS') && !hasWarehouseAccess) {
          navigate('/shop');
      } else if (hasWarehouseAccess) {
           // If they manually selected "Shop" but have admin rights, we could still respect that?
           // The user complaint was "it brings me to cashier directly".
           // Let's prioritize Warehouse if they have ANY warehouse rights, UNLESS they specifically toggled "Shop" (maybe?).
           // Actually, standard behavior: Admin/Manager -> Dashboard. Cashier -> POS.
           navigate('/warehouse');
      } else {
          navigate('/shop');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (mounted) setLoading(false); // Safety check if needed, or just let it unmount
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px 32px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>{t('auth.login.title')}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{t('auth.login.subtitle')}</p>
        </div>

        {/* Role Toggle */}
        <div style={{ 
          background: '#F5F5F7', 
          padding: '4px', 
          borderRadius: '12px', 
          display: 'flex',
          marginBottom: '24px'
        }}>
          <button 
            type="button"
            onClick={() => setActiveTab(ROLES.ADMIN)}
            className="btn"
            style={{ 
              flex: 1, 
              background: activeTab === ROLES.ADMIN ? '#FFF' : 'transparent',
              boxShadow: activeTab === ROLES.ADMIN ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              color: activeTab === ROLES.ADMIN ? '#000' : '#888',
              padding: '10px'
            }}
          >
            {t('auth.login.warehouseTab')}
          </button>
          <button 
             type="button"
             onClick={() => setActiveTab(ROLES.EMPLOYEE)}
             className="btn"
             style={{ 
               flex: 1, 
               background: activeTab === ROLES.EMPLOYEE ? '#FFF' : 'transparent',
               boxShadow: activeTab === ROLES.EMPLOYEE ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
               color: activeTab === ROLES.EMPLOYEE ? '#000' : '#888',
               padding: '10px'
             }}
          >
            {t('auth.login.shopTab')}
          </button>
        </div>
        


        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('auth.login.username')}</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#999' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '40px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activeTab === ROLES.ADMIN ? t('auth.login.usernameAdminPlaceholder') : t('auth.login.usernameShopPlaceholder')}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('auth.login.password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#999' }} />
              <input 
                type="password" 
                className="input-field"
                style={{ paddingLeft: '40px' }} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.login.passwordPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              color: 'var(--color-error)', 
              background: 'rgba(255, 59, 48, 0.1)', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', display: 'flex', gap: '8px' }}
            disabled={loading}
          >
           {loading ? t('auth.login.entering') : (
             <>
               {t('auth.login.enterAs', { role: activeTab === ROLES.ADMIN ? t('auth.roles.admin') : t('auth.roles.employee') })}
               <ArrowRight size={18}/>
             </>
           )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
