import { ArrowLeft, UserPlus, Shield, Trash2, Mail, CheckSquare, Square } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService } from "../../auth/services/authService";
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from 'react-i18next';

const BranchEmployeesView = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({ 
    name: '', 
    email: '', 
    password: '',
    permissions: ['POS_ACCESS'] // Default to Sale only
  });

  const PERMISSION_OPTIONS = [
    { id: 'POS_ACCESS', label: t('warehouse.branches.detail.employeesConfig.permPos') },
    { id: 'INVENTORY_WRITE', label: t('warehouse.branches.detail.employeesConfig.permInventory') },
    { id: 'REPORTS_VIEW', label: t('warehouse.branches.detail.employeesConfig.permReports') },
  ];

  const togglePermission = (permId) => {
    if (newEmp.permissions.includes(permId)) {
      setNewEmp({ ...newEmp, permissions: newEmp.permissions.filter(p => p !== permId) });
    } else {
      setNewEmp({ ...newEmp, permissions: [...newEmp.permissions, permId] });
    }
  };

  const getPermissionLabel = (perms) => {
    if (perms.includes('REPORTS_VIEW') && perms.includes('INVENTORY_WRITE')) return t('warehouse.branches.detail.employeesConfig.roleBranchAdmin');
    if (perms.includes('INVENTORY_WRITE')) return t('warehouse.branches.detail.employeesConfig.roleStockManager');
    return t('warehouse.branches.detail.employeesConfig.roleSalesAgent');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
        await authService.createEmployee({
            name: newEmp.name,
            username: newEmp.email, // Using email field as username for simplicity in UI matching
            password: newEmp.password,
            permissions: newEmp.permissions,
            permissionLabel: getPermissionLabel(newEmp.permissions),
            branchId: branchId // Link to current branch
        });
        alert(t('warehouse.branches.detail.employeesConfig.successMessage'));
        setShowAdd(false);
        setNewEmp({ name: '', email: '', password: '', permissions: ['POS_ACCESS'] });
        loadEmployees(); // Reload list
    } catch (error) {
        alert(t('warehouse.branches.detail.employeesConfig.failMessage') + ": " + error.message);
    }
  };

  const loadEmployees = async () => {
      try {
          const empList = await authService.getEmployees(branchId);
          setEmployees(empList.map(e => ({
              ...e,
              email: e.username // Map username back to email for display if needed
          })));
      } catch (error) {
          console.error("Failed to load employees", error);
      }
  };

  // Load on mount
  useEffect(() => {
      loadEmployees();
  }, []);

  const handleRemove = async (id) => {
    if(window.confirm(t('warehouse.branches.detail.employeesConfig.revokeConfirm'))) {
      try {
        await authService.deleteEmployee(id);
        setEmployees(employees.filter(e => e.id !== id));
      } catch (error) {
        alert(t('warehouse.branches.detail.employeesConfig.deleteError', { error: error.message }));
      }
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{t('warehouse.branches.detail.employeesConfig.title')}</h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('warehouse.branches.detail.employeesConfig.subtitle')}</p>
          </div>
        </div>
        {user && user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={20} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '8px' }} /> {t('warehouse.branches.detail.employeesConfig.addStaff')}
            </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '32px' }}>
        
        {/* Employee List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '400px' }}>
          {employees.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Shield size={40} style={{ opacity: 0.2 }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('common.noData', 'No Staff Found')}</h3>
              <p style={{ margin: 0, fontSize: '14px', maxWidth: '300px', lineHeight: '1.5', opacity: 0.7 }}>
                {t('warehouse.branches.detail.employeesConfig.noStaffDesc', 'There are no employees assigned to this branch yet. Use the form to add new staff members.')}
              </p>
            </div>
          ) : (
             employees.map((emp, idx) => (
            <div key={emp.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '24px', 
              borderBottom: idx < employees.length-1 ? '1px solid var(--color-border)' : 'none',
              flexDirection: isRtl ? 'row-reverse' : 'row'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ 
                  width: '52px', height: '52px', borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #E0Eafc, #CFDEF3)', color: '#555',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '20px'
                }}>
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: 'var(--color-text-primary)' }}>{emp.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Shield size={12} style={{ color: 'var(--color-text-secondary)' }} /> {emp.permissionLabel}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.7, marginTop: '4px' }}>{emp.email}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                   {/* Visual Capability Badges */}
                   {emp.permissions.includes('POS_ACCESS') && <span title="Sales" style={{ padding: '4px', background: '#E5F9E5', borderRadius: '4px', color: '#007000', fontSize: '10px', fontWeight: 'bold' }}>POS</span>}
                   {emp.permissions.includes('INVENTORY_WRITE') && <span title="Inventory" style={{ padding: '4px', background: '#FFF0E6', borderRadius: '4px', color: '#D00', fontSize: '10px', fontWeight: 'bold' }}>INV</span>}
                   {emp.permissions.includes('REPORTS_VIEW') && <span title="Reports" style={{ padding: '4px', background: '#E6F4FF', borderRadius: '4px', color: '#0066CC', fontSize: '10px', fontWeight: 'bold' }}>RPT</span>}
                </div>
                {user && user.role === 'admin' && (
                    <button 
                    className="btn" 
                    style={{ padding: '8px', color: '#D00', opacity: 0.6 }}
                    onClick={() => handleRemove(emp.id)}
                    >
                    <Trash2 size={18}/>
                    </button>
                )}
              </div>
            </div>
          ))
        )}
        </div>

        {/* Add Form / Sidebar */}
        <div>
          {showAdd ? (
            <div className="card" style={{ border: '2px solid var(--color-primary)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>{t('warehouse.branches.detail.employeesConfig.credentialSetup')}</h3>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Credentials */}
                <div style={{ background: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.detail.employeesConfig.loginDetails')}</label>
                  <div style={{ marginBottom: '12px' }}>
                    <input className="input-field" placeholder={t('warehouse.branches.detail.employeesConfig.fullName')} value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required style={{ background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <input className="input-field" placeholder={t('warehouse.branches.detail.employeesConfig.usernameEmail')} value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} required style={{ background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
                  </div>
                  <div>
                    <input className="input-field" type="password" placeholder={t('warehouse.branches.detail.employeesConfig.password')} value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required style={{ background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} />
                  </div>
                </div>

                {/* Permissions */}
                <div>
                   <label style={{ display: 'block', fontSize: '12px', marginBottom: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.detail.employeesConfig.accessLevel')}</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {PERMISSION_OPTIONS.map(opt => {
                       const isSelected = newEmp.permissions.includes(opt.id);
                       return (
                         <div 
                           key={opt.id}
                           onClick={() => togglePermission(opt.id)}
                           style={{ 
                             display: 'flex', alignItems: 'center', gap: '12px', 
                             padding: '12px', borderRadius: '8px', cursor: 'pointer',
                             background: isSelected ? 'rgba(0, 122, 255, 0.1)' : 'var(--color-bg-app)',
                             border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                             transition: 'all 0.2s',
                             flexDirection: isRtl ? 'row-reverse' : 'row'
                           }}
                         >
                           {isSelected 
                             ? <CheckSquare size={20} color="var(--color-primary)" fill="var(--color-primary-light)" /> 
                             : <Square size={20} color="var(--color-text-secondary)" />
                           }
                           <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400 }}>{opt.label}</span>
                         </div>
                       );
                     })}
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                   <button type="button" className="btn" style={{ flex: 1, padding: '12px' }} onClick={() => setShowAdd(false)}>{t('common.cancel', 'Cancel')}</button>
                   <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>{t('warehouse.branches.detail.employeesConfig.createUser')}</button>
                </div>
              </form>
            </div>
          ) : (
             <div className="card" style={{ background: 'var(--color-bg-secondary)', border: 'none', textAlign: 'center', padding: '40px 24px' }}>
               <Shield size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}/>
               <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--color-text-primary)' }}>{t('warehouse.branches.detail.employeesConfig.secureAccess')}</h4>
               <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                 {t('warehouse.branches.detail.employeesConfig.secureAccessDesc')}
               </p>
               <button className="btn" style={{ marginTop: '16px', background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} onClick={() => setShowAdd(true)}>
                 + {t('warehouse.branches.detail.employeesConfig.addUser')}
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchEmployeesView;
