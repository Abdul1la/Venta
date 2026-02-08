import { ArrowLeft, Save, Camera, Plus, Trash2, Barcode } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { inventoryService } from './inventoryService';
import { useAuth } from '../../auth/AuthContext';
import { useNotification } from '../../../components/ui/NotificationContext';
import { useTranslation } from 'react-i18next';

const BranchInventoryForm = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId, itemId } = useParams();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('category');
  const navigate = useNavigate();

  // Basic Details
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: catParam || '',
    brand: '',
    material: '',
    description: '',
    costPrice: '',
    sellPrice: '',
    currency: 'USD', // Default currency
    discount: '',
    imageUrl: null,
  });

  // Variants (Color/Size/Stock)
  const [variants, setVariants] = useState([
    { id: 1, color: '', size: '', quantity: 0 }
  ]);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categories, setCategories] = useState([]);

  // Load Item Validation & Categories
  useEffect(() => {
    const init = async () => {
      // 1. Load Categories
      try {
        const cats = await inventoryService.getCategories();
        setCategories(cats);
      } catch (e) {
        console.error("Error loading categories", e);
      }

      // 2. Load Item if Edit Mode
      if (itemId) {
        setIsEditMode(true);
        loadItemForEdit();
      } else if (catParam) {
        // Ensure category is set if we have the param
        setFormData(prev => ({ ...prev, category: catParam }));
      }
    };
    init();
  }, [itemId, catParam]);

  const loadItemForEdit = async () => {
    try {
      const item = await inventoryService.getItemById(itemId);
      if (item) {
        setFormData({
          barcode: item.barcode || '',
          name: item.name || '',
          category: item.category || '',
          brand: item.brand || '',
          material: item.material || '',
          description: item.description || '',
          costPrice: item.costPrice || '',
          sellPrice: item.sellPrice || '',
          priceIQD: item.priceIQD || '',
          priceEUR: item.priceEUR || '',
          discount: item.discount || '',
          imageUrl: item.imageUrl || null
        });
        if (item.imageUrl) setImagePreview(item.imageUrl);
        if (item.variants) setVariants(item.variants);
      }
    } catch (error) {
      console.error("Failed to load item", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVariantChange = (id, field, value) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const addVariant = () => {
    setVariants([...variants, { id: Date.now(), color: '', size: '', quantity: 0 }]);
  };

  const removeVariant = (id) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const calculateTotalStock = () => variants.reduce((acc, curr) => acc + Number(curr.quantity), 0);

  // Notification Hook
  const { showNotification } = useNotification();

  const handleSave = async () => {
    if (!formData.barcode || !formData.name || !formData.sellPrice) {
      showNotification(t('warehouse.branches.detail.inventoryForm.validationError'), 'error');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = formData.imageUrl; // Keep existing if no new file

      // Upload Image if selected
      if (imageFile) {
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const { storage } = await import("../../../lib/firebase");

        const storageRef = ref(storage, `items/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const payload = {
        ...formData,
        branchId,
        imageUrl: imageUrl || null,
        variants,
        sellPrice: Number(formData.sellPrice) || 0, // USD Base
        priceIQD: Number(formData.priceIQD) || 0,
        priceEUR: Number(formData.priceEUR) || 0,
        costPrice: Number(formData.costPrice) || 0,
        discount: Number(formData.discount || 0),
        stock: calculateTotalStock()
      };

      if (isEditMode) {
        await inventoryService.updateItem(itemId, payload);
        showNotification(t('warehouse.branches.detail.inventoryForm.updateSuccess'), 'success');
      } else {
        await inventoryService.addItem(payload);
        showNotification(t('warehouse.branches.detail.inventoryForm.saveSuccess'), 'success');
      }
      setTimeout(() => navigate(`/warehouse/branches/${branchId}`), 1000); // Delay slightly for effect
    } catch (error) {
      console.error(error);
      showNotification(t('warehouse.branches.detail.inventoryForm.saveError') + ": " + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check Permissions
  const { hasPermission } = useAuth();
  if (!hasPermission('INVENTORY_WRITE')) {
    return (
      <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center', padding: '40px' }} className="card">
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>{t('warehouse.branches.detail.inventoryForm.accessDenied')}</h2>
        <p style={{ color: '#666' }}>{t('warehouse.branches.detail.inventoryForm.accessDeniedDesc')}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '24px' }}
          onClick={() => navigate(`/warehouse/branches/${branchId}`)}
        >
          {t('warehouse.branches.detail.inventoryForm.returnDashboard')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={() => navigate(`/warehouse/branches/${branchId}`)}
          className="btn"
          style={{ padding: '8px', background: 'transparent', border: '1px solid var(--color-border)', transform: isRtl ? 'rotate(180deg)' : 'none' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{isEditMode ? t('warehouse.branches.detail.inventoryForm.editItem') : t('warehouse.branches.detail.inventoryForm.addNewItem')}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{isEditMode ? t('warehouse.branches.detail.inventoryForm.editSubtitle') : t('warehouse.branches.detail.inventoryForm.addSubtitle')}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>

        {/* LEFT COLUMN: Main Form */}
        <div className="card">
          <h3 style={{ margin: '0 0 24px', fontSize: '18px' }}>{t('warehouse.branches.detail.inventoryForm.productDetails')}</h3>

          {/* Barcode - CRITICAL */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{t('warehouse.branches.detail.inventoryForm.itemBarcode')} ({t('warehouse.branches.detail.inventoryForm.manualEntry')}) <span style={{ color: 'red' }}>*</span></label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode size={20} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '12px', color: '#999' }} />
                <input
                  name="barcode"
                  className="input-field"
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 'bold' }}
                  placeholder="Type barcode digits..."
                  value={formData.barcode}
                  onChange={handleInputChange}
                  autoFocus
                />
              </div>
              <button className="btn" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.inventoryForm.autoGenerate')}</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
              {t('warehouse.branches.detail.inventoryForm.barcodeNote')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.itemName')}</label>
              <input name="name" className="input-field" placeholder={t('warehouse.branches.detail.inventoryForm.itemNamePlaceholder')} value={formData.name} onChange={handleInputChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.category')}</label>
              <select name="category" className="input-field" value={formData.category} onChange={handleInputChange}>
                <option value="">{t('warehouse.branches.detail.inventoryForm.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.brand')}</label>
              <input name="brand" className="input-field" placeholder="e.g. Nike, Zara" value={formData.brand} onChange={handleInputChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.materialFabric')}</label>
              <input name="material" className="input-field" placeholder="e.g. 100% Cotton" value={formData.material} onChange={handleInputChange} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.description')}</label>
            <textarea name="description" className="input-field" rows="3" placeholder="Additional details..." value={formData.description} onChange={handleInputChange} />
          </div>

          <h4 style={{ margin: '0 0 16px', fontSize: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.inventoryForm.pricingMultiCurrency')}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.pricing')} (USD) <span style={{ color: 'red' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '12px', color: 'var(--color-text-secondary)' }}>$</span>
                <input
                  type="number"
                  name="sellPrice"
                  className="input-field"
                  value={formData.sellPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '28px' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.pricing')} (IQD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '12px', color: 'var(--color-text-secondary)' }}>IQD</span>
                <input
                  type="number"
                  name="priceIQD"
                  className="input-field"
                  value={formData.priceIQD || ''}
                  onChange={handleInputChange}
                  placeholder="0"
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '45px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.pricing')} (EUR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '12px', color: 'var(--color-text-secondary)' }}>€</span>
                <input
                  type="number"
                  name="priceEUR"
                  className="input-field"
                  value={formData.priceEUR || ''}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '28px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.costPrice')} (USD)</label>
              <input name="costPrice" type="number" className="input-field" placeholder="0.00" value={formData.costPrice} onChange={handleInputChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{t('warehouse.branches.detail.inventoryForm.discount')} (%)</label>
              <input name="discount" type="number" className="input-field" placeholder="0" value={formData.discount || ''} onChange={handleInputChange} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Image & Variants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Image Upload */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.inventoryForm.itemImage')}</h4>
            <div style={{
              width: '100%', aspectRatio: '1', background: 'var(--color-bg-app)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              overflow: 'hidden', border: '2px dashed var(--color-border)', position: 'relative'
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: 'var(--color-text-placeholder)' }}>
                  <Camera size={32} style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '12px' }}>{t('warehouse.branches.detail.inventoryForm.uploadOptional')}</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Variants (Colors & Sizes) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.inventoryForm.variantsAndStock')}</h3>
            </div>

            <div style={{ background: 'var(--color-bg-app)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                <div>{t('warehouse.branches.detail.inventoryForm.color')}</div>
                <div>{t('warehouse.branches.detail.inventoryForm.size')}</div>
                <div>{t('warehouse.branches.detail.inventoryForm.qty')}</div>
                <div></div>
              </div>

              {variants.map((variant) => (
                <div key={variant.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <input
                    placeholder={t('warehouse.branches.detail.inventoryForm.colorPlaceholder')}
                    className="input-field"
                    style={{ padding: '8px' }}
                    value={variant.color}
                    onChange={e => handleVariantChange(variant.id, 'color', e.target.value)}
                  />
                  <input
                    placeholder={t('warehouse.branches.detail.inventoryForm.sizePlaceholder')}
                    className="input-field"
                    style={{ padding: '8px' }}
                    value={variant.size}
                    onChange={e => handleVariantChange(variant.id, 'size', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="0"
                    className="input-field"
                    style={{ padding: '8px' }}
                    value={variant.quantity}
                    onChange={e => handleVariantChange(variant.id, 'quantity', e.target.value)}
                  />
                  <button
                    className="btn"
                    style={{ padding: '8px', color: '#D00' }}
                    onClick={() => removeVariant(variant.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                onClick={addVariant}
                className="btn"
                style={{ width: '100%', marginTop: '8px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-primary)' }}
              >
                <Plus size={14} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '6px' }} /> {t('warehouse.branches.detail.inventoryForm.addVariant')}
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              <span>{t('warehouse.branches.detail.inventoryForm.totalStock')}:</span>
              <span>{calculateTotalStock()}</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '16px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={loading}
          >
            <Save size={20} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} />
            {loading ? t('warehouse.branches.detail.inventoryForm.saving') : (isEditMode ? t('warehouse.branches.detail.inventoryForm.updateItem') : t('warehouse.branches.detail.inventoryForm.saveItem'))}
          </button>

        </div>
      </div>
    </div>
  );
};

export default BranchInventoryForm;
