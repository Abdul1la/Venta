import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useEffect } from 'react';

const LanguageSelector = () => {
    const { i18n, t } = useTranslation();

    const languages = [
        { code: 'en', name: 'English', desc: 'English', dir: 'ltr' },
        { code: 'ku', name: 'Kurdî (Bahdînî)', desc: 'Bahdînî', dir: 'rtl' }
    ];

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        const lang = languages.find(l => l.code === code);
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = code;
        localStorage.setItem('app-language', code);
    };

    useEffect(() => {
        const savedLang = localStorage.getItem('app-language') || 'en';
        const lang = languages.find(l => l.code === savedLang);
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = savedLang;
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                <Languages size={18} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('common.language', 'Language')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${i18n.language === lang.code ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: i18n.language === lang.code ? 'rgba(0, 102, 204, 0.05)' : 'var(--color-bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <span style={{ 
                            fontSize: '15px', 
                            fontWeight: 600, 
                            color: i18n.language === lang.code ? 'var(--color-primary)' : 'var(--color-text-primary)' 
                        }}>
                            {lang.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {lang.desc}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSelector;
