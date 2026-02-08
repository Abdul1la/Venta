import { ArrowLeft, Search, Filter } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { salesService } from '../../shop/services/salesService';
import { useTranslation } from 'react-i18next';

const MOCK_ACTIONS = [
  { id: 'txn_1024', type: 'SALE', item: 'Running Shoes (Nike)', amount: 120, user: 'Ahmed', time: '10:42 AM' },
  { id: 'txn_1023', type: 'SALE', item: 'Cotton T-Shirt (White)', amount: 25, user: 'Sarah', time: '10:15 AM' },
  { id: 'txn_1022', type: 'REFUND', item: 'Leather Belt', amount: -45, user: 'Ahmed', time: '09:30 AM' },
  { id: 'txn_1021', type: 'SALE', item: 'Formal Suit (Black)', amount: 350, user: 'Sarah', time: '09:12 AM' },
];

const BranchActionsView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [actions, setActions] = useState([]);

  // Filter State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employee: '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    const loadActions = async () => {
      try {
        // 1. Load Sales
        const salesData = await salesService.getBranchSales(branchId);

        // 2. Load Staff Directory (for retroactive name lookup)
        // This ensures old records with only 'adminId' still show a name
        let staffMap = {};
        try {
          const allStaff = await import('../../auth/services/authService').then(m => m.authService.getAllStaff());
          allStaff.forEach(s => {
            staffMap[s.id] = s.name || s.username || 'Staff'; // Map ID to Best Available Name
          });
        } catch (e) {
          console.error("Failed to load staff directory", e);
        }

        // 3. Map Sales
        const formattedActions = salesData.map(sale => {
          // Resolve User Name: 
          // Prio 1: Saved Name (Fastest)
          // Prio 2: Lookup from Directory (Fixes old records)
          // Prio 3: Fallback ID or 'Staff'
          const resolvedName = sale.adminName || staffMap[sale.adminId] || sale.adminId || 'Staff';

          return {
            id: sale.id,
            type: 'SALE',
            item: sale.items && sale.items.length > 0 ? `${sale.items[0].name}${sale.items.length > 1 ? ` +${sale.items.length - 1}` : ''}` : 'Unknown Item',
            amount: Number(sale.total) || 0,
            paymentMethod: sale.paymentMethod || 'Cash',
            status: sale.status || 'COMPLETED',
            currency: sale.currency || 'USD',
            user: resolvedName,
            rawDate: sale.createdAt?.toDate ? sale.createdAt.toDate().toISOString().split('T')[0] : (sale.date || ''),
            time: sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          };
        });
        setActions(formattedActions);
      } catch (err) {
        console.error("Failed to load actions", err);
      }
    };
    loadActions();
  }, [branchId]);

  const uniqueEmployees = [...new Set(actions.map(a => a.user))].filter(Boolean);

  const filteredActions = actions.filter(action => {
    // 1. Text Search
    if (searchTerm && !action.item.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    // 2. Date Filter
    if (filters.startDate && action.rawDate < filters.startDate) return false;
    if (filters.endDate && action.rawDate > filters.endDate) return false;

    // 3. Employee Filter
    if (filters.employee && !action.user.toLowerCase().includes(filters.employee.toLowerCase())) return false;

    // 4. Price Filter
    if (filters.minPrice && action.amount < Number(filters.minPrice)) return false;
    if (filters.maxPrice && action.amount > Number(filters.maxPrice)) return false;

    return true;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
            color: 'var(--color-text-primary)'
          }}
        >
          <ArrowLeft size={20} color="var(--color-text-primary)" />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{t('warehouse.branches.actions.title')}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('warehouse.branches.actions.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Toolbar & Filters */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Search Row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '12px', color: 'var(--color-text-secondary)' }} />
              <input
                className="input-field"
                placeholder={t('warehouse.branches.actions.searchPlaceholder')}
                style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '36px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn" style={{ background: 'var(--color-bg-secondary)', padding: '10px 16px', color: 'var(--color-text-primary)' }}>
              <Filter size={16} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} /> {t('warehouse.branches.actions.filter')}
            </button>
          </div>

          {/* Expanded Filter Row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', background: 'var(--color-bg-app)', borderRadius: '12px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.actions.dateRange')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" className="input-field" style={{ padding: '8px', fontSize: '12px', width: '130px', background: 'var(--color-bg-card)' }}
                  value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                <input type="date" className="input-field" style={{ padding: '8px', fontSize: '12px', width: '130px', background: 'var(--color-bg-card)' }}
                  value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.actions.employee')}</label>
              <select className="input-field" style={{ padding: '8px', fontSize: '12px', width: '150px', background: 'var(--color-bg-card)' }}
                value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })}>
                <option value="">{t('common.allEmployees', 'All Employees')}</option>
                {uniqueEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.actions.priceRange')}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" placeholder={t('warehouse.branches.actions.min')} className="input-field" style={{ padding: '8px', fontSize: '12px', width: '80px', background: 'var(--color-bg-card)' }}
                  value={filters.minPrice} onChange={e => setFilters({ ...filters, minPrice: e.target.value })} />
                <input type="number" placeholder={t('warehouse.branches.actions.max')} className="input-field" style={{ padding: '8px', fontSize: '12px', width: '80px', background: 'var(--color-bg-card)' }}
                  value={filters.maxPrice} onChange={e => setFilters({ ...filters, maxPrice: e.target.value })} />
              </div>
            </div>
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', employee: '', minPrice: '', maxPrice: '' })}
              style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '12px', background: 'transparent', border: 'none', color: '#007AFF', cursor: 'pointer', height: '36px' }}
            >
              {t('warehouse.branches.actions.clear')}
            </button>
          </div>
        </div>

        {/* List */}
        <div>
          {filteredActions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{t('warehouse.branches.actions.noActions')}</div>
          ) : (
            filteredActions.map((action, idx) => (
              <div
                key={action.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderBottom: idx < filteredActions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: idx % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-app)',
                  flexDirection: isRtl ? 'row-reverse' : 'row'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    background: action.type === 'REFUND' ? '#FFE5E5' : (action.status === 'ORDER' ? '#FFF4E5' : '#E5F9E5'),
                    color: action.type === 'REFUND' ? '#D00' : (action.status === 'ORDER' ? '#FF9500' : '#007000'),
                    background: action.type === 'REFUND' ? 'var(--color-error-bg)' : (action.status === 'ORDER' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)'),
                    color: action.type === 'REFUND' ? 'var(--color-error)' : (action.status === 'ORDER' ? 'var(--color-warning)' : 'var(--color-success)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px'
                  }}>
                    {action.type === 'REFUND' ? 'RF' : (action.status === 'ORDER' ? 'ORD' : 'SL')}
                  </div>
                  <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{action.item}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{action.time} • {t('common.by', 'By')} {action.user}</div>
                    {action.paymentMethod && (
                      <div style={{ fontSize: '11px', color: action.status === 'ORDER' ? 'var(--color-warning)' : 'var(--color-primary)', marginTop: '2px', fontWeight: 500 }}>
                        {action.status === 'ORDER' ? t('warehouse.branches.actions.pendingOrder') : `${t('warehouse.branches.actions.paidVia')} ${action.paymentMethod}`}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div style={{ fontWeight: 'bold', color: action.type === 'REFUND' ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                    {action.type === 'REFUND' ? '-' : '+'}${Math.abs(action.amount)}
                  </div>
                  {action.currency !== 'USD' && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      ({action.currency})
                    </div>
                  )}
                </div>
              </div>
            )))}
        </div>
      </div>
    </div>
  );
};

export default BranchActionsView;
