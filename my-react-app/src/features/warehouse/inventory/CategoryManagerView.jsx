import { ArrowLeft, Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';

const MOCK_CATEGORIES = [
  { id: 1, name: 'Suits', count: 42 },
  { id: 2, name: 'Shoes', count: 120 },
  { id: 3, name: 'T-Shirts', count: 350 },
  { id: 4, name: 'Trousers', count: 85 },
];

// const MOCK_CATEGORIES = ... (Removed)

const CategoryManagerView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load Categories on Mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { inventoryService } = await import('./inventoryService');
      const data = await inventoryService.getCategories();
      setCategories(data);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    setLoading(true);
    try {
      const { inventoryService } = await import('./inventoryService');
      await inventoryService.addCategory(newCatName);
      await loadCategories(); // Refresh
      setNewCatName('');
      setShowModal(false);
    } catch (e) {
      if (e.message === "Category already exists") {
        alert(t('warehouse.inventory.categoryExists'));
      } else {
        alert(e.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const confirmDelete = (category) => {
    setCategoryToDelete(category);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setLoading(true);
    try {
      const { inventoryService } = await import('./inventoryService');
      await inventoryService.deleteCategory(categoryToDelete.id);

      // Update local state
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setCategoryToDelete(null);
    } catch (e) {
      console.error("Delete failed", e);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(`/warehouse/branches/${branchId}`)}
            className="btn"
            style={{ padding: '8px', background: 'transparent', border: '1px solid var(--color-border)', transform: isRtl ? 'rotate(180deg)' : 'none' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{t('warehouse.inventory.categories')}</h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('warehouse.inventory.manageTypes')}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} /> {t('warehouse.inventory.addCategory')}
        </button>
      </div>

      {showModal && (
        <div style={{ marginBottom: '24px' }} className="card">
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px' }}>
            <input
              className="input-field"
              placeholder={t('warehouse.inventory.categoryPlaceholder')}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </button>
            <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {categories.map(cat => (
          <div
            key={cat.id}
            className="card"
            onClick={() => navigate(`/warehouse/branches/${branchId}/inventory?category=${encodeURIComponent(cat.name)}`)}
            style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--color-bg-app)', padding: '8px', borderRadius: '8px' }}>
                <Tag size={18} color="var(--color-text-secondary)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{cat.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('warehouse.inventory.itemsCount', { count: cat.count })}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                style={{ padding: '6px', fontSize: '10px' }}
                onClick={(e) => { e.stopPropagation(); /* Edit logic here if needed */ }}
              >
                <Edit2 size={14} />
              </button>
              <button
                className="btn"
                style={{ padding: '6px', fontSize: '10px', color: 'var(--color-error)' }}
                onClick={(e) => { e.stopPropagation(); confirmDelete(cat); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title={t('warehouse.inventory.deleteCategory')}
        message={t('warehouse.inventory.deleteCategoryConfirm', { name: categoryToDelete?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};

export default CategoryManagerView;
