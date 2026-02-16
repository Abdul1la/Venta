import { ArrowLeft, Plus, DollarSign, FileText, Trash2, Calendar, TrendingDown, Wallet, Printer, X } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <button 
        onClick={onBack}
        style={{ 
          width: '40px', height: '40px', borderRadius: '12px', 
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--color-text-primary)',
          transform: isRtl ? 'rotate(180deg)' : 'none'
        }}
      >
        <ArrowLeft size={20} color="currentColor" />
      </button>
      <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0', letterSpacing: '-1px', color: 'var(--color-text-primary)' }}>{title}</h1>
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
                 originalItems: sale.items, // Pass full items for modal
                 count: sale.items ? sale.items.reduce((acc, i) => acc + (i.qty || 1), 0) : 0,
                 total: Number(sale.total) || 0,
                 currency: sale.currency || 'USD',
                 status: sale.status || 'COMPLETED',
                 user: resolvedName,
                 clientName: sale.clientName,
                 payments: sale.payments,
                 change: sale.change
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

  const handleDeleteExpense = (expenseId) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure?'))) {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }
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
      <div style={{ background: 'var(--color-bg-card)', padding: '5px', borderRadius: '14px', display: 'inline-flex', marginBottom: '32px', border: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ 
            padding: '10px 24px', borderRadius: '11px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            background: activeTab === 'sales' ? 'var(--color-bg-app)' : 'transparent',
            boxShadow: activeTab === 'sales' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            color: activeTab === 'sales' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          {t('warehouse.branches.detail.reports.salesHistory')}
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          style={{ 
            padding: '10px 24px', borderRadius: '11px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            background: activeTab === 'expenses' ? 'var(--color-bg-app)' : 'transparent',
            boxShadow: activeTab === 'expenses' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            color: activeTab === 'expenses' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            transition: 'all 0.2s'
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.reports.expenseTypes')}</h3>
                <button 
                  className="btn" 
                  style={{ 
                    padding: '8px 14px', 
                    height: 'auto',
                    borderRadius: '10px', 
                    background: 'var(--color-primary)', 
                    border: '1px solid var(--color-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    color: '#FFF',
                    fontSize: '13px',
                    fontWeight: 600
                  }} 
                  onClick={() => setShowAddType(!showAddType)}
                >
                  <Plus size={16} color="#FFF" /> 
                  <span>{t('warehouse.branches.detail.reports.addType', 'Add Type')}</span>
                </button>
              </div>
              {showAddType && (
                <form onSubmit={handleAddType} style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
                  <input
                    className="input-field"
                    placeholder={t('warehouse.branches.detail.reports.newCategoryPlaceholder')}
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    autoFocus
                    style={{ fontSize: '13px', background: 'var(--color-bg-app)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontWeight: 700 }}>{t('warehouse.branches.detail.reports.add')}</button>
                </form>
              )}

              <div style={{ display: 'grid', gap: '10px' }}>
                {expenseTypes.map(type => (
                  <button 
                    key={type.id} 
                    onClick={() => setSelectedType(type)}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '16px 20px', 
                      background: selectedType?.id === type.id ? 'rgba(0,122,255,0.1)' : 'var(--color-bg-app)',
                      color: selectedType?.id === type.id ? '#007AFF' : 'var(--color-text-primary)',
                      border: '1px solid',
                      borderColor: selectedType?.id === type.id ? '#007AFF' : 'var(--color-border)',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      textAlign: isRtl ? 'right' : 'left',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: selectedType?.id === type.id ? '0 4px 12px rgba(0,122,255,0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                       <div style={{ 
                         padding: '10px', borderRadius: '10px', 
                         background: selectedType?.id === type.id ? 'rgba(0,122,255,0.2)' : 'var(--color-bg-card)',
                         color: selectedType?.id === type.id ? '#007AFF' : 'var(--color-text-secondary)'
                       }}>
                         <Wallet size={18} />
                       </div>
                       <span style={{ fontWeight: 700, fontSize: '15px' }}>{type.name}</span>
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
                style={{ 
                  padding: '80px 40px', textAlign: 'center', 
                  color: 'var(--color-text-secondary)', background: 'var(--color-bg-app)', 
                  border: '2px dashed var(--color-border)', borderRadius: '24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <FileText size={40} style={{ opacity: 0.2, color: 'var(--color-text-primary)' }} />
                </div>
                <h3 style={{ margin: '0 0 12px', color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: 800 }}>{t('warehouse.branches.detail.reports.selectCategory')}</h3>
                <p style={{ margin: 0, fontSize: '15px', maxWidth: '300px', lineHeight: '1.5', opacity: 0.7 }}>{t('warehouse.branches.detail.reports.selectCategoryDesc')}</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedType.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="card"
                style={{ padding: '0', overflow: 'hidden' }}
                id="expense-print-area"
              >
                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-app)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{selectedType.name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.reports.expenseLog')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button 
                         onClick={() => {
                           const headers = ["Date", "Description", "Amount", "Category"];
                           const csvContent = [
                             headers.join(","),
                             ...filteredExpenses.map(e => [e.date, `"${e.note}"`, e.amount, selectedType.name].join(","))
                           ].join("\n");
                           const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                           const link = document.createElement("a");
                           link.href = URL.createObjectURL(blob);
                           link.download = `${selectedType.name}_expenses.csv`;
                           link.click();
                         }}
                         className="btn"
                         title="Export CSV"
                         style={{ padding: '8px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                       >
                         <TrendingDown size={18} style={{ transform: 'rotate(180deg)' }} />
                       </button>
                       <button
                         onClick={() => window.print()} 
                         className="btn"
                         title="Print"
                         style={{ padding: '8px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                       >
                         <Printer size={18} />
                       </button>
                    </div>

                    <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{t('warehouse.branches.detail.reports.totalSpent')}</div>
                      <div style={{ fontSize: '28px', fontWeight: 900, color: '#FF453A' }}>
                        ${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <style>
                {`
                  @media print {
                    body * { visibility: hidden; }
                    #expense-print-area, #expense-print-area * { visibility: visible; }
                    #expense-print-area {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      background: white;
                      color: black;
                      padding: 20px;
                    }
                    .btn, .input-field, form { display: none !important; }
                  }
                `}
                </style>

                {/* Add Form */}
                <div style={{ padding: '24px 32px', background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}>
                  <form onSubmit={handleRecordExpense}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{t('warehouse.branches.detail.reports.note')}</label>
                        <input 
                          className="input-field" 
                          placeholder="e.g. Monthly Bill" 
                          value={expenseForm.note}
                          onChange={e => setExpenseForm({...expenseForm, note: e.target.value})}
                          required
                          style={{ background: 'var(--color-bg-app)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', padding: '12px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{t('warehouse.branches.detail.reports.amount')}</label>
                        <input 
                          type="number" 
                          className="input-field" 
                          placeholder="0.00" 
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                          required
                          style={{ background: 'var(--color-bg-app)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', padding: '12px' }}
                        />
                      </div>
                      <div style={{ flex: 1.2 }}>
                         <label style={{ fontSize: '11px', fontWeight: 800, [isRtl ? 'marginRight' : 'marginLeft']: '4px', marginBottom: '8px', display: 'block', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{t('warehouse.branches.detail.reports.date')}</label>
                         <input 
                           type="date" 
                           className="input-field" 
                           value={expenseForm.date}
                           onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                           required
                           style={{ background: 'var(--color-bg-app)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', padding: '12px' }}
                         />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px', background: '#FF453A', borderColor: '#FF453A', fontWeight: 700, borderRadius: '12px' }}>
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
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-app)', zIndex: 10 }}>
                        <tr style={{ textAlign: isRtl ? 'right' : 'left', color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>
                          <th style={{ padding: '18px 32px' }}>{t('warehouse.branches.detail.reports.dateHeader')}</th>
                          <th style={{ padding: '18px' }}>{t('warehouse.branches.detail.reports.descriptionHeader')}</th>
                          <th style={{ padding: '18px', textAlign: isRtl ? 'left' : 'right' }}>{t('warehouse.branches.detail.reports.amountHeader')}</th>
                          <th style={{ padding: '18px 32px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '16px 32px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>{item.date}</td>
                            <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.note}</td>
                            <td style={{ padding: '16px', textAlign: isRtl ? 'left' : 'right', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '15px' }}>${item.amount.toLocaleString()}</td>
                            <td style={{ padding: '16px 32px', textAlign: isRtl ? 'left' : 'right' }}>
                              <button 
                                className="btn" 
                                onClick={() => handleDeleteExpense(item.id)}
                                style={{ padding: '8px', color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} 
                                onMouseEnter={e => e.currentTarget.style.color = '#FF453A'} 
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                              >
                                <Trash2 size={16}/>
                              </button>
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
  const [selectedSale, setSelectedSale] = useState(null);

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
    <motion.div 
      id="sales-print-area" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="card" 
      style={{ 
        padding: '0', 
        overflow: 'hidden', 
        background: 'var(--color-bg-card)', 
        border: '1px solid var(--color-border)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
      }}
    >
      <div className="no-print" style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.reports.completeSalesLog')}</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {Object.entries(currencyTotals).map(([curr, amount]) => (
                <div key={curr} style={{ padding: '10px 16px', background: 'var(--color-bg-app)', borderRadius: '12px', fontSize: '13px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>{t('warehouse.branches.detail.reports.total')} {curr}:</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '15px' }}>
                      {curr === 'USD' ? '$' : ''}{amount.toLocaleString()}
                  </span>
                </div>
            ))}
               <button 
                 onClick={() => window.print()}
                 className="btn" 
                 style={{ background: '#007AFF', color: '#FFF', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none' }}
               >
                 <Printer size={16} /> {t('warehouse.branches.detail.reports.printReport')}
               </button>
               <button className="btn" style={{ background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>{t('warehouse.branches.detail.reports.exportCSV')}</button>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '20px', background: 'var(--color-bg-app)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.reports.dateRange')}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" className="input-field" style={{ padding: '10px', fontSize: '13px', width: '150px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} 
                        value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                    <input type="date" className="input-field" style={{ padding: '10px', fontSize: '13px', width: '150px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} 
                        value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.reports.employee')}</label>
                <select className="input-field" style={{ padding: '10px', fontSize: '13px', width: '180px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})}>
                    <option value="">{t('warehouse.branches.detail.reports.allEmployees')}</option>
                    {uniqueEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.reports.priceRange')}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" placeholder={t('warehouse.branches.detail.reports.min')} className="input-field" style={{ padding: '10px', fontSize: '13px', width: '100px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={filters.minPrice} onChange={e => setFilters({...filters, minPrice: e.target.value})} />
                    <input type="number" placeholder={t('warehouse.branches.detail.reports.max')} className="input-field" style={{ padding: '10px', fontSize: '13px', width: '100px', background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                        value={filters.maxPrice} onChange={e => setFilters({...filters, maxPrice: e.target.value})} />
                </div>
            </div>
             <button 
                onClick={() => setFilters({ startDate: '', endDate: '', employee: '', minPrice: '', maxPrice: '' })}
                style={{ alignSelf: 'flex-end', padding: '10px 20px', fontSize: '13px', background: 'transparent', border: 'none', color: '#007AFF', cursor: 'pointer', height: '42px', fontWeight: 700 }}
             >
                 {t('warehouse.branches.detail.reports.clear')}
             </button>
        </div>

      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: isRtl ? 'right' : 'left', background: 'var(--color-bg-app)', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: '18px 24px' }}>{t('warehouse.branches.detail.reports.date')}</th>
            <th style={{ padding: '18px' }}>{t('warehouse.branches.detail.reports.status')}</th>
            <th style={{ padding: '18px' }}>{t('shop.receipt.clientLabel', 'Client')}</th>
            <th style={{ padding: '18px' }}>{t('warehouse.branches.detail.reports.itemsSold')}</th>
            <th style={{ padding: '18px' }}>{t('shop.pos.paymentMethod', 'Payment')}</th>
            <th style={{ padding: '18px' }}>{t('warehouse.branches.detail.reports.staff')}</th>
            <th style={{ padding: '18px 24px', textAlign: isRtl ? 'left' : 'right' }}>{t('warehouse.branches.detail.reports.total')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '15px' }}>{t('warehouse.branches.detail.reports.noSalesFound')}</td></tr>
          ) : (
            filteredSales.map(sale => (
                <tr 
                  key={sale.id} 
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-gray-50"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                <td style={{ padding: '20px 24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{sale.dateDisplay.split(' ')[0]}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{sale.dateDisplay.split(' ').slice(1).join(' ')}</div>
                </td>
                <td style={{ padding: '20px 16px' }}>
                     <span style={{ 
                         padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800,
                         background: sale.status === 'ORDER' ? 'rgba(255, 149, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                         color: sale.status === 'ORDER' ? '#FF9500' : '#34C759',
                         border: `1px solid ${sale.status === 'ORDER' ? 'rgba(255,149,0,0.3)' : 'rgba(52,199,89,0.3)'}`,
                         textTransform: 'uppercase', letterSpacing: '0.5px'
                     }}>
                         {sale.status === 'ORDER' ? t('warehouse.branches.detail.reports.order') : t('warehouse.branches.detail.reports.sale')}
                     </span>
                </td>
                 <td style={{ padding: '20px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {sale.clientName || '-'}
                </td>
                <td style={{ padding: '20px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{sale.items[0]}</div>
                    {sale.items.length > 1 && <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.detail.reports.moreItems', { count: sale.items.length - 1 })}</div>}
                </td>
                <td style={{ padding: '20px 16px', fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                    {sale.paymentMethod || 'Cash'}
                </td>
                <td style={{ padding: '20px 16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    {sale.user}
                </td>
                <td style={{ padding: '20px 24px', textAlign: isRtl ? 'left' : 'right', fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '16px' }}>
                    {sale.currency === 'ID' || sale.currency === 'IQD' || sale.currency === 'Dinar' ? '' : '$'}{sale.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{fontSize: '11px', opacity: 0.7}}>{sale.currency}</span>
                </td>
                </tr>
            ))
          )}
        </tbody>
      </table>

      {/* DETAILED TRANSACTION MODAL */}
      <AnimatePresence>
        {selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}
             onClick={() => setSelectedSale(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="card"
              style={{ 
                padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
              onClick={e => e.stopPropagation()}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                 <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>{t('warehouse.branches.detail.actions.transactionDetails')}</h2>
                 <button onClick={() => setSelectedSale(null)} style={{ background: 'var(--color-bg-app)', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}><X size={20}/></button>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.actions.dateTime')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedSale.dateDisplay}</div>
                  </div>
                   <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.actions.saleId')}</div>
                    <div style={{ fontWeight: 500, fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{selectedSale.id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.actions.client')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedSale.clientName || 'N/A'}</div>
                  </div>
                   <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.actions.servedBy')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedSale.user}</div>
                  </div>
               </div>

               {/* Payments Section */}
               <div style={{ marginBottom: '32px', padding: '24px', background: 'var(--color-bg-app)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                 <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: '0 0 16px 0', fontWeight: 800, letterSpacing: '0.5px' }}>{t('shop.pos.paymentDetails')}</h3>
                 {selectedSale.payments && selectedSale.payments.length > 0 ? (
                   selectedSale.payments.map((p, idx) => (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{p.method} ({p.currency})</span>
                        <span style={{ fontWeight: 700 }}>{Number(p.amount).toLocaleString()} {p.currency}</span>
                     </div>
                   ))
                 ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{selectedSale.status === 'ORDER' ? 'Pay Later' : 'Cash (Standard)'}</span>
                        <span style={{ fontWeight: 700 }}>{selectedSale.total.toLocaleString()} {selectedSale.currency}</span>
                     </div>
                 )}
                 
                 {selectedSale.change && (
                    <>
                      <div style={{ height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34C759', fontSize: '15px' }}>
                        <span style={{ fontWeight: 600 }}>{t('warehouse.branches.detail.actions.changeGiven')}</span>
                        <span style={{ fontWeight: 800 }}>{Number(selectedSale.change.amount).toLocaleString()} {selectedSale.change.currency}</span>
                      </div>
                    </>
                 )}
               </div>

               {/* Items List */}
               <div style={{ padding: '0 4px' }}>
                  <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: '0 0 16px 0', fontWeight: 800, letterSpacing: '0.5px' }}>{t('warehouse.branches.detail.inventoryConfig.stock')}</h3>
                  <table style={{ width: '100%', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    <tbody>
                      {selectedSale.originalItems && selectedSale.originalItems.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px 0', color: 'var(--color-text-primary)', fontWeight: 500 }}>{item.qty}x {item.name}</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>
                            ${(item.sellPrice || item.price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ paddingTop: '20px', fontWeight: 800, fontSize: '18px', color: 'var(--color-text-primary)' }}>{t('common.total')}</td>
                        <td style={{ paddingTop: '20px', textAlign: 'right', fontWeight: 900, fontSize: '20px', color: 'var(--color-text-primary)' }}>
                           {selectedSale.currency === 'USD' ? '$' : ''}{selectedSale.total.toLocaleString()} <span style={{fontSize: '12px', opacity: 0.7}}>{selectedSale.currency}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
               </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
};
