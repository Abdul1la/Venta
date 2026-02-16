import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, Save, ShieldCheck, Globe, Coins, RefreshCw } from 'lucide-react';
import { settingsService } from '../common/services/settingsService';
import { authService } from '../auth/services/authService';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../components/ui/NotificationContext';
import { motion } from 'framer-motion';
import LanguageSelector from '../../components/common/LanguageSelector';

const AdminSettingsView = () => {
    const { t, i18n } = useTranslation();
    const { user, login } = useAuth();
    const { showNotification } = useNotification();
    const isRtl = i18n.dir() === 'rtl';
    const [loading, setLoading] = useState(false);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: user?.password || '',
        confirmPassword: user?.password || ''
    });

    const [exchangeRates, setExchangeRates] = useState({
        USD: 1,
        IQD: 1500,
        EUR: 0.92
    });

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const rates = await settingsService.getExchangeRates();
                setExchangeRates(rates);
            } catch (err) {
                console.error("Rates fetch error", err);
            }
        };
        fetchRates();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        if (!formData.username || !formData.password) {
            showNotification('Username and password are required', 'error');
            return;
        }

        setLoading(true);
        try {
            const updateData = {
                username: formData.username,
                password: formData.password
            };

            await authService.updateAdmin(user.id, updateData);

            // Update local user state
            const updatedUser = { ...user, ...updateData };
            login(updatedUser);

            showNotification('Profile updated successfully', 'success');
        } catch (error) {
            showNotification(error.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRates = async () => {
        setRatesLoading(true);
        try {
            await settingsService.updateExchangeRates(exchangeRates);
            showNotification('Exchange rates updated for all branches', 'success');
        } catch (error) {
            showNotification('Failed to update rates', 'error');
        } finally {
            setRatesLoading(false);
        }
    };

    const handleRateChange = (currency, value) => {
        setExchangeRates(prev => ({ ...prev, [currency]: Number(value) }));
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                    {t('warehouse.settings.title')}
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    {t('warehouse.settings.subtitle')}
                </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <LanguageSelector />
            </div>

            {/* NEW: Exchange Rates Section */}
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="card" 
               style={{ padding: '32px', marginBottom: '24px', border: '1px solid var(--color-border)' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                   <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
                      <Globe size={20} />
                   </div>
                   <div>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{t('warehouse.settings.exchangeRates', 'Daily Exchange Rates')}</h2>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>{t('warehouse.settings.exchangeRatesDesc', 'Set the conversion rate used by the POS system today.')}</p>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                   <div>
                       <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{t('common.exchangeTitle', { currency: 'IQD' })}</label>
                       <div style={{ position: 'relative' }}>
                          <input 
                              type="number" 
                              value={exchangeRates.IQD} 
                              onChange={e => handleRateChange('IQD', e.target.value)}
                              className="input-field"
                              style={{ width: '100%', paddingLeft: '40px', fontWeight: 700 }}
                          />
                          <Coins size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                       </div>
                   </div>
                   <div>
                       <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{t('common.exchangeTitle', { currency: 'EUR' })}</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                              type="number" 
                              step="0.01"
                              value={exchangeRates.EUR} 
                              onChange={e => handleRateChange('EUR', e.target.value)}
                              className="input-field"
                              style={{ width: '100%', paddingLeft: '40px', fontWeight: 700 }}
                          />
                          <Coins size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                       </div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    <button 
                        onClick={handleUpdateRates}
                        disabled={ratesLoading}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#34C759', borderColor: '#34C759' }}
                    >
                        {ratesLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {t('warehouse.settings.updateRates', 'Update Today’s Rates')}
                    </button>
                </div>

                {/* MAINTENANCE SECTION */}
                <div style={{ paddingTop: '24px', marginTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                     <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px', color: 'var(--color-text-primary)' }}>{t('warehouse.settings.maintenance', 'Maintenance')}</h3>
                     
                     <div style={{ display: 'grid', gap: '16px' }}>
                        {/* Sync Inventory Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--color-bg-subtle)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>{t('warehouse.settings.syncTitle', 'Sync Inventory Cache')}</h4>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                    {t('warehouse.settings.syncDesc', 'Fixes incorrect price display (72 IQD vs 80,000 IQD) by refreshing local data.')}
                                </p>
                            </div>
                            <button 
                                onClick={async () => {
                                   setLoading(true);
                                   try {
                                       const { inventoryService } = await import('./inventory/inventoryService');
                                       // Assuming current user branch or a default. Ideally passed or fetched. 
                                       // For Admin view without explicit branch context, we might need to ask or sync all? 
                                       // Let's assume we sync the user's branch or just try to sync 'all' if possible?
                                       // Force refresh takes a branchId. 
                                       // The AdminSettingsView doesn't seemingly have branchId in props/params based on file content.
                                       // It uses `user`. Let's use `user.branchId`.
                                       const branchId = user?.branchId || '1'; // Fallback
                                       const count = await inventoryService.forceRefreshInventory(branchId);
                                       showNotification(t('warehouse.settings.syncSuccess', { count }), 'success');
                                   } catch (e) {
                                       console.error(e);
                                       showNotification(t('common.error'), 'error');
                                   } finally {
                                       setLoading(false);
                                   }
                                }}
                                className="btn"
                                style={{ background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '13px' }}
                             >
                                <RefreshCw size={14} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} />
                                {t('warehouse.settings.syncBtn', 'Sync Now')}
                             </button>
                        </div>

                        {/* Recalculate Prices Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--color-bg-subtle)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>{t('warehouse.settings.recalcTitle', 'Recalculate DB Prices')}</h4>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                    {t('warehouse.settings.recalcDesc', 'Updates database values based on current exchange rates.')}
                                </p>
                            </div>
                             <button 
                                onClick={async () => {
                                   if (!window.confirm(t('warehouse.settings.confirmRecalc', 'Recalculate all inventory prices with new rates?'))) return;
                                   setLoading(true);
                                   try {
                                       const { inventoryService } = await import('./inventory/inventoryService');
                                       const count = await inventoryService.recalculateInventoryPrices(exchangeRates);
                                       showNotification(t('warehouse.settings.recalcSuccess', { count }), 'success');
                                   } catch (e) {
                                       console.error(e);
                                       showNotification(t('common.error'), 'error');
                                   } finally {
                                       setLoading(false);
                                   }
                                }}
                                className="btn"
                                style={{ background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '13px' }}
                             >
                                <Coins size={14} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} />
                                {t('warehouse.settings.recalcBtn', 'Recalculate')}
                             </button>
                        </div>
                     </div>
                </div>
            </motion.div>

            <div className="card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {t('warehouse.settings.username')}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="input-field"
                                style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '48px', width: '100%' }}
                                placeholder={t('warehouse.settings.username')}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {t('warehouse.settings.newPassword')}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input-field"
                                style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '48px', width: '100%' }}
                                placeholder={t('warehouse.settings.newPassword')}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {t('warehouse.settings.confirmPassword')}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <ShieldCheck size={18} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input-field"
                                style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '48px', width: '100%' }}
                                placeholder={t('warehouse.settings.confirmPassword')}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                        >
                            <Save size={18} />
                            {loading ? t('warehouse.settings.saving') : t('warehouse.settings.saveChanges')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSettingsView;
