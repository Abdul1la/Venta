import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useTranslation } from 'react-i18next';

const PaymentMethodsView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const navigate = useNavigate();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMethodName, setNewMethodName] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // Load Initial Methods
  useEffect(() => {
    loadMethods();
  }, [branchId]);

  const loadMethods = async () => {
    try {
      const { branchService } = await import('../services/branchService');
      const data = await branchService.getPaymentConfig(branchId);
      setMethods(data);
    } catch (e) {
      console.error("Failed to load methods", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMethods = async (newMethods) => {
    try {
      const { branchService } = await import('../services/branchService');
      await branchService.updatePaymentConfig(branchId, newMethods);
      setMethods(newMethods);
    } catch (e) {
      console.error("Failed to save methods", e);
      alert(t('warehouse.branches.detail.paymentConfig.saveError'));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newMethodName) return;

    const newMethod = {
      id: Date.now().toString(),
      name: newMethodName,
      icon: '💳',
      active: true,
      currency: 'USD' // Defaulting to USD for custom methods for now
    };

    const updated = [...methods, newMethod];
    await handleSaveMethods(updated);

    setNewMethodName('');
    setShowAdd(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('warehouse.branches.detail.paymentConfig.deleteConfirm'))) {
      const updated = methods.filter(m => m.id !== id);
      await handleSaveMethods(updated);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate(`/warehouse/branches/${branchId}`)}
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--color-text-primary)',
            transform: isRtl ? 'rotate(180deg)' : 'none'
          }}
        >
          <ArrowLeft size={20} color="var(--color-text-primary)" />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.paymentConfig.title')}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('warehouse.branches.detail.paymentConfig.subtitle')}</p>
        </div>
      </div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ padding: '32px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.paymentConfig.activeMethods')}</h3>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} /> {t('warehouse.branches.detail.paymentConfig.addMethod')}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleAdd}
            style={{ display: 'flex', gap: '12px', marginBottom: '24px', padding: '16px', background: 'var(--color-bg-app)', borderRadius: '12px' }}
          >
            <input
              className="input-field"
              placeholder={t('warehouse.branches.detail.paymentConfig.methodNamePlaceholder')}
              value={newMethodName}
              onChange={e => setNewMethodName(e.target.value)}
              autoFocus
              style={{ background: 'var(--color-bg-card)' }}
            />
            <button type="submit" className="btn btn-primary">{t('common.save', 'Save')}</button>
            <button type="button" className="btn" onClick={() => setShowAdd(false)}>{t('common.cancel', 'Cancel')}</button>
          </motion.form>
        )}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {methods.map(method => (
            <div
              key={method.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '24px' }}>{method.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text-primary)' }}>{method.name}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: 'var(--color-chart-green)', background: 'var(--color-bg-app)',
                  padding: '4px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-border)'
                }}>
                  <CheckCircle size={12} /> {t('common.active', 'Active')}
                </span>
                <button
                  onClick={() => handleDelete(method.id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-placeholder)', padding: '4px' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px', padding: '16px', borderRadius: '8px', background: 'var(--color-bg-app)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
          <strong>{t('warehouse.branches.detail.paymentConfig.noteTitle')}</strong> {t('warehouse.branches.detail.paymentConfig.noteText')}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentMethodsView;
