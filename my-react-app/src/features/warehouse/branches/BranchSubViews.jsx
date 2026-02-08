import { ArrowLeft, Plus, DollarSign, FileText, Trash2, Calendar, TrendingDown, Wallet, Printer } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { salesService } from '../../shop/services/salesService';
import { useAuth } from '../../auth/AuthContext';

import { useTranslation } from 'react-i18next';

const SimpleBackLayout = ({ title, children, onBack }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <button 
        onClick={onBack}
        style={{ 
          width: '40px', height: '40px', borderRadius: '12px', 
          background: '#FFF', border: '1px solid #E5E5EA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          padding: 0,
          color: '#000',
          transform: isRtl ? 'rotate(180deg)' : 'none'
        }}
      >
        <ArrowLeft size={20} color="#000" />
      </button>
      <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0', letterSpacing: '-0.5px' }}>{title}</h1>
    </div>
    {children}
  </motion.div>
  );
};

export const BranchSalesReportsView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { branchId } = useParams();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const initialTab = searchParams.get('tab') || 'expenses';
  const [activeTab, setActiveTab] = useState(initialTab);

  // --- EXPENSE STATE ---
  const [expenseTypes, setExpenseTypes] = useState([
    { id: 1, name: 'Electricity' },
    { id: 2, name: 'Internet' },
    { id: 3, name: 'Maintenance' },
    { id: 4, name: 'Salaries' },
    { id: 5, name: 'Rent' }
  ]);
  const [selectedType, setSelectedType] = useState(null); 
  const [expenses, setExpenses] = useState([
    { id: 101, categoryId: 1, note: 'Oct Bill', amount: 150, date: '2023-10-25' },
    { id: 102, categoryId: 3, note: 'AC Repair', amount: 50, date: '2023-10-24' },
  ]);
  const [expenseForm, setExpenseForm] = useState({ note: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  // --- SALES STATE ---
  // --- SALES STATE ---
  const [sales, setSales] = useState([]);
  const [currencyTotals, setCurrencyTotals] = useState({});

  useEffect(() => {
      const loadSales = async () => {
      try {
        if (activeTab === 'sales') {
          // 1. Load Sales
          const salesData = await salesService.getBranchSales(branchId);
          
          // 2. Load Staff Directory
          let staffMap = {};
          try {
              const allStaff = await import('../../auth/services/authService').then(m => m.authService.getAllStaff());
              allStaff.forEach(s => {
                  staffMap[s.id] = s.name || s.username || 'Staff'; 
              });
          } catch (e) { console.error(e); }

          // 3. Map Sales
          const formattedSales = salesData.map(sale => {
             const resolvedName = sale.adminName || staffMap[sale.adminId] || sale.adminId || 'Staff';
             
             return {
                 id: sale.id,
                 rawDate: sale.createdAt?.toDate ? sale.createdAt.toDate().toISOString().split('T')[0] : (sale.date || ''),
                 dateDisplay: sale.date + ' ' + (sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''),
                 items: sale.items ? sale.items.map(i => i.name) : ['Unknown Item'],
                 count: sale.items ? sale.items.reduce((acc, i) => acc + (i.qty || 1), 0) : 0,
                 total: Number(sale.total) || 0,
                 currency: sale.currency || 'USD',
                 status: sale.status || 'COMPLETED',
                 user: resolvedName
             };
          });
          setSales(formattedSales);

          // Calculate Currency Totals
          const totals = formattedSales.reduce((acc, sale) => {
              const curr = sale.currency || 'USD';
              acc[curr] = (acc[curr] || 0) + sale.total;
              return acc;
          }, {});
          setCurrencyTotals(totals);
        }
      } catch (err) {
        console.error("Failed to load sales log", err);
      }
    };
    loadSales();
  }, [branchId, activeTab]);

  // Sync tab with URL
  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'expenses');
  }, [searchParams]);

  const handleAddType = (e) => {
    e.preventDefault();
    if (!newTypeName) return;
    setExpenseTypes([...expenseTypes, { id: Date.now(), name: newTypeName }]);
    setNewTypeName('');
    setShowAddType(false);
  };

  const handleRecordExpense = (e) => {
    e.preventDefault();
    if (!selectedType || !expenseForm.amount) return;
    setExpenses([
      { 
        id: Date.now(), 
        categoryId: selectedType.id,
        note: expenseForm.note, 
        amount: Number(expenseForm.amount), 
        date: expenseForm.date 
      },
      ...expenses
    ]);
    setExpenseForm({ note: '', amount: '', date: new Date().toISOString().split('T')[0] });
  };

  const filteredExpenses = selectedType 
    ? expenses.filter(e => e.categoryId === selectedType.id)
    : [];

  // Permissions Check
  const { user, hasPermission } = useAuth();
  const canViewReports = hasPermission('REPORTS_VIEW');

  if (!canViewReports) {
      return (
        <SimpleBackLayout title="Restricted Access" onBack={() => navigate(`/warehouse/branches/${branchId}`)}>
            <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <h3>{t('warehouse.branches.detail.reports.accessDenied', 'Access Denied')}</h3>
                <p>{t('warehouse.branches.detail.reports.accessDeniedDesc', 'You do not have permission to view financial records and sales logs.')}</p>
            </div>
        </SimpleBackLayout>
      );
  }

  return (
    <SimpleBackLayout title={activeTab === 'expenses' ? t('warehouse.branches.detail.reports.expenses') : t('warehouse.branches.detail.reports.salesHistory')} onBack={() => navigate(`/warehouse/branches/${branchId}`)}>
      
      {/* Custom Tab Switcher */}
      <div style={{ background: '#F1F1F4', padding: '4px', borderRadius: '14px', display: 'inline-flex', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ 
            padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            background: activeTab === 'sales' ? '#FFF' : 'transparent',
            boxShadow: activeTab === 'sales' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            color: activeTab === 'sales' ? '#000' : '#888'
          }}
        >
          {t('warehouse.branches.detail.reports.salesHistory')}
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          style={{ 
            padding: '10px 24px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            background: activeTab === 'expenses' ? '#FFF' : 'transparent',
            boxShadow: activeTab === 'expenses' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            color: activeTab === 'expenses' ? '#000' : '#888'
          }}
        >
          {t('warehouse.branches.detail.reports.expenses')}
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '24px' }}>
          
          {/* LEFT: Categories Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="card" style={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{t('warehouse.branches.detail.reports.expenseTypes')}</h3>
                <button 
                  className="btn" 
                  style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => setShowAddType(!showAddType)}
                >
                  <Plus size={16}/>
                </button>
              </div>

              {showAddType && (
                <form onSubmit={handleAddType} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <input 
                    className="input-field" 
                    placeholder={t('warehouse.branches.detail.reports.newCategoryPlaceholder')}
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    autoFocus
                    style={{ fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>{t('warehouse.branches.detail.reports.add')}</button>
                </form>
              )}

              <div style={{ display: 'grid', gap: '10px' }}>
                {expenseTypes.map(type => (
                  <button 
                    key={type.id} 
                    onClick={() => setSelectedType(type)}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '16px', 
                      background: selectedType?.id === type.id ? '#1C1C1E' : '#FFF',
                      color: selectedType?.id === type.id ? '#FFF' : '#333',
                      border: '1px solid',
                      borderColor: selectedType?.id === type.id ? '#1C1C1E' : '#E5E5EA',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: isRtl ? 'right' : 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ 
                         padding: '8px', borderRadius: '8px', 
                         background: selectedType?.id === type.id ? 'rgba(255,255,255,0.2)' : '#F5F5F7' 
                       }}>
                         <Wallet size={16} />
                       </div>
                       <span style={{ fontWeight: 600, fontSize: '14px' }}>{type.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Detail Drill-down */}
          <div>
            {!selectedType ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card" 
                style={{ padding: '60px', textAlign: 'center', color: '#888', background: '#F9F9FB', borderStyle: 'dashed' }}
              >
                <FileText size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px', color: '#000' }}>{t('warehouse.branches.detail.reports.selectCategory')}</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>{t('warehouse.branches.detail.reports.selectCategoryDesc')}</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedType.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="card"
                style={{ padding: '0', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>{selectedType.name}</h3>
                    <div style={{ fontSize: '13px', color: '#888' }}>{t('warehouse.branches.detail.reports.expenseLog')}</div>
                  </div>
                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{t('warehouse.branches.detail.reports.totalSpent')}</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF3B30' }}>
                      ${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Add Form */}
                <div style={{ padding: '24px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  <form onSubmit={handleRecordExpense}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '6px', display: 'block', color: '#666' }}>{t('warehouse.branches.detail.reports.note')}</label>
                        <input 
                          className="input-field" 
                          placeholder="e.g. Monthly Bill" 
                          value={expenseForm.note}
                          onChange={e => setExpenseForm({...expenseForm, note: e.target.value})}
                          required
                          style={{ background: '#FFF' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '6px', display: 'block', color: '#666' }}>{t('warehouse.branches.detail.reports.amount')}</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="0.00" 
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                          required
                          style={{ background: '#FFF' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                         <label style={{ fontSize: '12px', fontWeight: 600, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '6px', display: 'block', color: '#666' }}>{t('warehouse.branches.detail.reports.date')}</label>
                         <input 
                           type="date" 
                           className="input-field" 
                           value={expenseForm.date}
                           onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                           required
                           style={{ background: '#FFF' }}
                         />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px', background: '#FF3B30', borderColor: '#FF3B30' }}>
                        {t('warehouse.branches.detail.reports.add')}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List */}
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {filteredExpenses.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                      {t('warehouse.branches.detail.reports.noExpenses', { type: selectedType.name })}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#FFF' }}>
                        <tr style={{ textAlign: isRtl ? 'right' : 'left', color: '#888', fontSize: '12px', borderBottom: '1px solid #eee' }}>
                          <th style={{ padding: '16px 24px' }}>{t('warehouse.branches.detail.reports.dateHeader')}</th>
                          <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.reports.descriptionHeader')}</th>
                          <th style={{ padding: '16px', textAlign: isRtl ? 'left' : 'right' }}>{t('warehouse.branches.detail.reports.amountHeader')}</th>
                          <th style={{ padding: '16px 24px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #F9F9F9' }}>
                            <td style={{ padding: '16px 24px', fontSize: '14px', color: '#666' }}>{item.date}</td>
                            <td style={{ padding: '16px', fontWeight: 500 }}>{item.note}</td>
                            <td style={{ padding: '16px', textAlign: isRtl ? 'left' : 'right', fontWeight: 'bold' }}>${item.amount}</td>
                            <td style={{ padding: '16px 24px', textAlign: isRtl ? 'left' : 'right' }}>
                              <button className="btn" style={{ padding: '6px', color: '#E5E5EA', hover: { color: '#D00' } }}><Trash2 size={16}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        /* SALES TAB - ISOLATED */
        <SalesTabContent sales={sales} currencyTotals={currencyTotals} />
      )}
    </SimpleBackLayout>
  );
};

const SalesTabContent = ({ sales, currencyTotals }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employee: '',
    minPrice: '',
    maxPrice: ''
  });

  const uniqueEmployees = [...new Set(sales.map(s => s.user))].filter(Boolean);

  const filteredSales = sales.filter(sale => {
    // 1. Date Filter
    if (filters.startDate && sale.rawDate < filters.startDate) return false;
    if (filters.endDate && sale.rawDate > filters.endDate) return false;
    
    // 2. Employee Filter
    if (filters.employee && !sale.user.toLowerCase().includes(filters.employee.toLowerCase())) return false;

    // 3. Price Filter
    if (filters.minPrice && sale.total < Number(filters.minPrice)) return false;
    if (filters.maxPrice && sale.total > Number(filters.maxPrice)) return false;

    return true;
  });

  return (
    <>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #sales-print-area, #sales-print-area * { visibility: visible; }
            #sales-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
              padding: 20px;
            }
            .no-print { display: none !important; }
            @page { margin: 10mm; }
          }
        `}
      </style>
    <motion.div id="sales-print-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('warehouse.branches.detail.reports.completeSalesLog')}</h3>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            {Object.entries(currencyTotals).map(([curr, amount]) => (
                <div key={curr} style={{ padding: '8px 16px', background: '#F5F5F7', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: '#666', [isRtl ? 'marginLeft' : 'marginRight']: '6px' }}>{t('warehouse.branches.detail.reports.total')} {curr}:</span>
                  <span style={{ fontWeight: 700, color: '#000' }}>
                      {curr === 'USD' ? '$' : ''}{amount.toLocaleString()} {curr !== 'USD' ? curr : ''}
                  </span>
                </div>
            ))}
               <button 
                 onClick={() => window.print()}
                 className="btn" 
                 style={{ background: '#007AFF', color: '#FFF', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
               >
                 <Printer size={14} /> {t('warehouse.branches.detail.reports.printReport')}
               </button>
               <button className="btn" style={{ background: '#F5F5F7', color: '#000', fontSize: '12px', fontWeight: 600 }}>{t('warehouse.branches.detail.reports.exportCSV')}</button>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px', background: '#FAFAFA', borderRadius: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>{t('warehouse.branches.detail.reports.dateRange')}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="date" className="input-field" style={{ padding: '8px', fontSize: '12px', width: '130px', background: '#FFF' }} 
                        value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                    <input type="date" className="input-field" style={{ padding: '8px', fontSize: '12px', width: '130px', background: '#FFF' }} 
                        value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>{t('warehouse.branches.detail.reports.employee')}</label>
                <select className="input-field" style={{ padding: '8px', fontSize: '12px', width: '150px', background: '#FFF' }}
                    value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})}>
                    <option value="">{t('warehouse.branches.detail.reports.allEmployees')}</option>
                    {uniqueEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>{t('warehouse.branches.detail.reports.priceRange')}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" placeholder={t('warehouse.branches.detail.reports.min')} className="input-field" style={{ padding: '8px', fontSize: '12px', width: '80px', background: '#FFF' }}
                        value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} />
                    <input type="number" placeholder={t('warehouse.branches.detail.reports.max')} className="input-field" style={{ padding: '8px', fontSize: '12px', width: '80px', background: '#FFF' }}
                        value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})} />
                </div>
            </div>
             <button 
                onClick={() => setFilters({ startDate: '', endDate: '', employee: '', minPrice: '', maxPrice: '' })}
                style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '12px', background: 'transparent', border: 'none', color: '#007AFF', cursor: 'pointer', height: '36px' }}
             >
                 {t('warehouse.branches.detail.reports.clear')}
             </button>
        </div>

      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: isRtl ? 'right' : 'left', background: '#FAFAFA', fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
            <th style={{ padding: '16px 24px' }}>{t('warehouse.branches.detail.reports.date')}</th>
            <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.reports.status')}</th>
            <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.reports.itemsSold')}</th>
            <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.reports.staff')}</th>
            <th style={{ padding: '16px' }}>{t('warehouse.branches.detail.reports.count')}</th>
            <th style={{ padding: '16px 24px', textAlign: isRtl ? 'left' : 'right' }}>{t('warehouse.branches.detail.reports.total')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{t('warehouse.branches.detail.reports.noSalesFound')}</td></tr>
          ) : (
            filteredSales.map(sale => (
                <tr key={sale.id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '20px 24px', color: '#555', fontSize: '14px' }}>{sale.dateDisplay}</td>
                <td style={{ padding: '20px 16px' }}>
                     <span style={{ 
                         padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                         background: sale.status === 'ORDER' ? '#FFF4E5' : '#E5F9E5',
                         color: sale.status === 'ORDER' ? '#FF9500' : '#34C759',
                         border: `1px solid ${sale.status === 'ORDER' ? '#FFD8A8' : '#C3F3C3'}`
                     }}>
                         {sale.status === 'ORDER' ? t('warehouse.branches.detail.reports.order') : t('warehouse.branches.detail.reports.sale')}
                     </span>
                </td>
                <td style={{ padding: '20px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{sale.items[0]}</div>
                    {sale.items.length > 1 && <div style={{ fontSize: '12px', color: '#888' }}>{t('warehouse.branches.detail.reports.moreItems', { count: sale.items.length - 1 })}</div>}
                </td>
                <td style={{ padding: '20px 16px', fontSize: '14px', color: '#666' }}>
                    {sale.user}
                </td>
                <td style={{ padding: '20px 16px', fontSize: '14px' }}>{sale.items.length}</td>
                <td style={{ padding: '20px 24px', textAlign: isRtl ? 'left' : 'right', fontWeight: 'bold', color: '#000', fontSize: '16px' }}>
                    {sale.currency === 'ID' || sale.currency === 'IQD' || sale.currency === 'Dinar' ? '' : '$'}{sale.total.toFixed(2)} {sale.currency}
                </td>
                </tr>
            ))
          )}
        </tbody>
      </table>
    </motion.div>
    </>
  );
};
