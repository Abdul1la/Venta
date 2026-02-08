import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { inventoryService } from './inventoryService';
import { ArrowLeft, Plus, Search, Filter, Trash2, Edit2, Package, AlertCircle, DollarSign, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const BranchInventoryView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Inventory on Mount
  useEffect(() => {
    loadInventory();
  }, [branchId]);

  const loadInventory = async () => {
    try {
      const data = await inventoryService.getBranchInventory(branchId);
      setItems(data);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('common.confirmDelete', 'Delete this item from inventory?'))) {
      try {
        await inventoryService.deleteItem(id);
        setItems(items.filter(i => i.id !== id));
      } catch (error) {
        alert(t('warehouse.branches.detail.inventoryConfig.deleteError'));
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Safe filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode || '').includes(searchTerm);
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats Calculation
  const totalItems = items.length;
  const stockValue = items.reduce((acc, i) => acc + ((Number(i.sellPrice) || 0) * (calculateStock(i.variants))), 0);
  const lowStockCount = items.filter(i => calculateStock(i.variants) < 5).length;

  function calculateStock(variants) {
    if (!variants) return 0;
    return variants.reduce((acc, v) => acc + (Number(v.quantity) || 0), 0);
  }

  const handleAddItem = () => {
    let url = `/warehouse/branches/${branchId}/add-item`;
    if (categoryFilter) {
      url += `?category=${encodeURIComponent(categoryFilter)}`;
    }
    navigate(url);
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}
    >
      {/* Header */}
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(`/warehouse/branches/${branchId}`)}
            className="btn"
            style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isRtl ? 'rotate(180deg)' : 'none' }}
          >
            <ArrowLeft size={20} color="var(--color-text-primary)" />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.inventoryConfig.title')}</h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('warehouse.branches.detail.inventoryConfig.subtitle')}</p>
          </div>
        </div>

        {hasPermission('INVENTORY_WRITE') && (
          <button
            className="btn btn-primary"
            onClick={handleAddItem}
          >
            <Plus size={20} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} /> {t('warehouse.branches.detail.inventoryConfig.addNewItem')}
          </button>
        )}
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <StatCard title={t('warehouse.branches.detail.inventoryConfig.totalItems')} value={totalItems} icon={Package} color="#007AFF" />
        <StatCard title={t('warehouse.branches.detail.inventoryConfig.stockValue')} value={`${stockValue.toLocaleString()}`} icon={DollarSign} color="#34C759" />
        <StatCard title={t('warehouse.branches.detail.inventoryConfig.lowStockAlerts')} value={lowStockCount} icon={AlertCircle} color="#FF9500" />
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants} className="card" style={{ padding: '0', overflow: 'hidden', minHeight: '500px' }}>

        {/* Toolbar */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-bg-app)' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '11px', color: 'var(--color-text-secondary)' }} />
              <input
                className="input-field"
                placeholder={t('warehouse.branches.detail.inventoryConfig.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', borderRadius: '20px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
              />
            </div>
            <button className="btn" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', padding: '0 16px', color: 'var(--color-text-primary)' }}>
              <Filter size={18} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} /> {t('warehouse.branches.detail.actions.filter')}
            </button>
          </div>

          {categoryFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryConfig.category')}:</span>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'var(--color-bg-secondary)', color: 'var(--color-primary)', padding: '4px 12px',
                borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--color-border)'
              }}>
                {categoryFilter}
                <X
                  size={14}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    searchParams.delete('category');
                    setSearchParams(searchParams);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
            <tr style={{ textAlign: isRtl ? 'right' : 'left', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 24px' }}>{t('warehouse.branches.detail.inventoryConfig.product')}</th>
              <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.inventoryConfig.category')}</th>
              <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.inventoryConfig.stock')}</th>
              <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.inventoryConfig.price')}</th>
              {hasPermission('INVENTORY_WRITE') && <th style={{ padding: '16px 24px', textAlign: isRtl ? 'left' : 'right' }}>{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-primary)' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>#{item.barcode}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: 'var(--color-bg-app)', color: 'var(--color-text-secondary)' }}>
                    {item.category}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{calculateStock(item.variants)}</span>
                    {calculateStock(item.variants) < 5 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-warning)', fontWeight: 'bold' }}>{t('warehouse.branches.detail.inventoryConfig.low')}</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                  {item.currency === 'USD' ? '$' : item.currency === 'EUR' ? '€' : ''}
                  {item.sellPrice}
                  {item.currency === 'IQD' ? ' IQD' : ''}
                </td>
                {hasPermission('INVENTORY_WRITE') && (
                  <td style={{ padding: '16px 24px', textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{ display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end', gap: '8px' }}>
                      <button className="btn" style={{ padding: '6px', color: 'var(--color-text-secondary)' }} onClick={() => navigate(`/warehouse/branches/${branchId}/edit-item/${item.id}`)}><Edit2 size={16} /></button>
                      <button className="btn" style={{ padding: '6px', color: 'var(--color-error)' }} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: `4px solid ${color}` }}>
    <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color: color }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  </div>
);

export default BranchInventoryView;
