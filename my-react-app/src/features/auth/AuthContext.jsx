import { createContext, useContext, useState, useEffect } from 'react';
import { ROLES } from './services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session storage on mount (per tab)
    const stored = sessionStorage.getItem('venta_user');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);

        // Don't request notification permission on page refresh
        // Only request on fresh login via login() function
      } catch (e) {
        console.error("Failed to parse user session", e);
        sessionStorage.removeItem('venta_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (userData) => {
    setUser(userData);
    sessionStorage.setItem('venta_user', JSON.stringify(userData));

    // Request notification permission for admin users
    if (userData.role === ROLES.ADMIN) {
      try {
        console.log('[Auth] Admin user detected, setting up FCM...');
        console.log('[Auth] User ID:', userData.id);

        const { fcmService } = await import('../../lib/fcmService');
        const token = await fcmService.requestPermissionAndGetToken();

        console.log('[Auth] FCM Token received:', token ? 'YES' : 'NO');

        if (token && userData.id) {
          console.log('[Auth] Saving token to Firestore for user ID:', userData.id);
          await fcmService.saveTokenToUser(userData.id, token);
          console.log('[Auth] FCM token saved successfully!');
        } else {
          console.warn('[Auth] Missing token or user ID:', { token: !!token, userId: userData.id });
        }
      } catch (error) {
        console.error('[Auth] Failed to register FCM token:', error);
      }
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('venta_user');
    localStorage.removeItem('fcm_token_registered'); // Keep this as is or remove if unused, but clearing local is safe
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === ROLES.ADMIN) return true; // Admins have all access
    return user.permissions && user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
