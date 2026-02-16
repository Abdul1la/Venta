import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Plus, MapPin, Users, DollarSign, Search, Filter, MoreHorizontal, ArrowRight, X, Trash2 } from 'lucide-react';
import { branchService } from '../services/branchService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';

const BranchesView = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRtl = i18n.dir() === 'rtl';
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newBranch, setNewBranch] = useState({ name: '', location: '', manager: '' });

  const fetchBranches = async () => {
    setLoading(true);
    const data = await branchService.getBranches();
    setBranches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, branchId: null, branchName: '' });

  const handleAddBranch = async (e) => {
    e.preventDefault();
    await branchService.addBranch(newBranch);
    setShowAddForm(false);
    setNewBranch({ name: '', location: '', manager: '' });
    fetchBranches();
  };

  const handleDeleteClick = (e, branchId, branchName) => {
    e.stopPropagation();
    setDeleteDialog({ isOpen: true, branchId, branchName });
  };

  const confirmDeleteBranch = async () => {
    if (deleteDialog.branchId) {
      await branchService.deleteBranch(deleteDialog.branchId);
      setDeleteDialog({ isOpen: false, branchId: null, branchName: '' });
      fetchBranches();
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>{t('common.loadingBranches')}</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}
    >
      {/* HEADER SECTION */}
      <motion.div
        variants={itemVariants}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '40px' }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            {t('common.locations', 'Store Locations')}
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
            {t('warehouse.branches.title')}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '11px', color: 'var(--color-text-secondary)' }} />
            <input
              className="input-field"
              placeholder={t('common.search')}
              style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', width: '240px', background: 'var(--color-bg-app)', borderColor: 'var(--color-border)' }}
            />
          </div>
          {/* Only Admins can add branches */}
          {user && user.role === 'admin' && (
            <button
              className="btn btn-primary"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={20} style={{ marginInlineEnd: '8px' }} /> {t('warehouse.branches.addBranch')}
            </button>
          )}
        </div>
      </motion.div>

      {/* ADD FORM OVERLAY */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card" style={{ padding: '32px', background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', position: 'relative' }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.openNewLocation')}</h3>

              <form onSubmit={handleAddBranch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.branchName')}</label>
                  <input className="input-field" placeholder="e.g. North Side Store" value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} required style={{ background: 'var(--color-bg-card)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.detail.actions.filter')}</label>
                  <input className="input-field" placeholder="Street Address" value={newBranch.location} onChange={e => setNewBranch({ ...newBranch, location: e.target.value })} required style={{ background: 'var(--color-bg-card)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.manager')}</label>
                  <input className="input-field" placeholder="Full Name" value={newBranch.manager} onChange={e => setNewBranch({ ...newBranch, manager: e.target.value })} required style={{ background: 'var(--color-bg-card)' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
                  Confirm & Create
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BRANCHES GRID */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {branches.map(branch => (
          <BranchCard 
            key={branch.id} 
            branch={branch} 
            onClick={() => navigate(`/warehouse/branches/${branch.id}`)}
            onDelete={(e) => handleDeleteClick(e, branch.id, branch.name)}
            isAdmin={user && user.role === 'admin'}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={t('warehouse.branches.deleteTitle', 'Delete Branch')}
        message={t('warehouse.branches.deleteConfirm', { name: deleteDialog.branchName, defaultValue: `Are you sure you want to delete ${deleteDialog.branchName}? This action cannot be undone.` })}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        isDestructive={true}
        onConfirm={confirmDeleteBranch}
        onCancel={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
      />
    </motion.div>
  );
};

const BranchCard = ({ branch, onClick, onDelete, isAdmin }) => {
  const { t, i18n } = useTranslation();
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}
      className="card"
      onClick={onClick}
      style={{
        padding: '0', cursor: 'pointer',
        border: '1px solid rgba(0,0,0,0.03)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}
    >
      {/* Card Header with Status */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{branch.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            <MapPin size={14} /> {branch.location}
          </div>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px',
          background: 'var(--color-bg-app)', color: '#34C759', textTransform: 'uppercase', border: '1px solid var(--color-border)'
        }}>
          {t('common.active', 'Active')}
        </span>
      </div>

      {/* Card Body - Stats & Info */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.employees')}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{branch.employees} {t('common.active')} • {branch.manager.split(' ')[0]}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
            <DollarSign size={18} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.revenue', 'Revenue')}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>${branch.revenue.toLocaleString()}</div>
          </div>
        </div>

      </div>

      {/* Card Footer - Action hint */}
      <div style={{ padding: '16px 24px', background: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('warehouse.branches.viewDetails')}</span>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
           {isAdmin && (
            <button 
              onClick={onDelete}
              style={{ padding: '6px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-error)', display: 'flex' }}
              title={t('common.delete')}
            >
              <Trash2 size={16} />
            </button>
           )}
           <ArrowRight size={16} color="var(--color-text-secondary)" style={{ transform: i18n.dir() === 'rtl' ? 'rotate(180deg)' : 'none' }} />
        </div>
      </div>

    </motion.div>
  );
};

export default BranchesView;
