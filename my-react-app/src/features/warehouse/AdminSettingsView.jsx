import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { authService } from '../auth/services/authService';
import { useNotification } from '../../components/ui/NotificationContext';
import { useTranslation } from 'react-i18next';
import { User, Lock, Save, ShieldCheck } from 'lucide-react';
import LanguageSelector from '../../components/common/LanguageSelector';

const AdminSettingsView = () => {
    const { t, i18n } = useTranslation();
    const { user, login } = useAuth();
    const { showNotification } = useNotification();
    const isRtl = i18n.dir() === 'rtl';
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: user?.password || '',
        confirmPassword: user?.password || ''
    });

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
