import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { NotificationProvider } from './components/ui/NotificationContext';
import LoginView from './features/auth/components/LoginView';
import WarehouseLayout from './features/warehouse/WarehouseLayout';
import WarehouseDashboard from './features/warehouse/dashboard/WarehouseDashboard';
import BranchesView from './features/warehouse/branches/BranchesView';
import BranchDetailView from './features/warehouse/branches/BranchDetailView';
import BranchActionsView from './features/warehouse/branches/BranchActionsView';
import CategoryManagerView from './features/warehouse/inventory/CategoryManagerView';
import BranchInventoryForm from './features/warehouse/inventory/BranchInventoryForm';
import BranchInventoryView from './features/warehouse/inventory/BranchInventoryView';
import { BranchSalesReportsView } from './features/warehouse/branches/BranchSubViews'; // Removed BranchEmployeesView from here
import BranchEmployeesView from './features/warehouse/branches/BranchEmployeesView'; // Import the real one
import PaymentMethodsView from './features/warehouse/branches/PaymentMethodsView';
import MonthlyReceiptsView from './features/warehouse/branches/MonthlyReceiptsView';
import AdminSettingsView from './features/warehouse/AdminSettingsView';
import ShopLayout from './features/shop/ShopLayout';
import ShopDashboard from './features/shop/dashboard/ShopDashboard';
import { useTranslation } from 'react-i18next';


import { ThemeProvider } from './components/ui/ThemeContext';
import { NetworkIndicator } from './components/ui/NetworkIndicator';

function App() {
  const { t } = useTranslation();
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <NetworkIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Warehouse Routes */}
              <Route path="/warehouse" element={<WarehouseLayout />}>
                <Route index element={<WarehouseDashboard />} />
                <Route path="branches" element={<BranchesView />} />
                <Route path="branches/:branchId" element={<BranchDetailView />} />
                <Route path="branches/:branchId/actions" element={<BranchActionsView />} />
                <Route path="branches/:branchId/sales" element={<BranchSalesReportsView />} />
                <Route path="branches/:branchId/categories" element={<CategoryManagerView />} />
                <Route path="branches/:branchId/inventory" element={<BranchInventoryView />} />
                <Route path="branches/:branchId/add-item" element={<BranchInventoryForm />} />
                <Route path="branches/:branchId/edit-item/:itemId" element={<BranchInventoryForm />} />
                <Route path="branches/:branchId/employees" element={<BranchEmployeesView />} />
                <Route path="branches/:branchId/payments" element={<PaymentMethodsView />} />
                <Route path="branches/:branchId/monthly-receipts" element={<MonthlyReceiptsView />} />
                <Route path="settings" element={<AdminSettingsView />} />
              </Route>

              <Route path="/shop" element={<ShopLayout />}>
                <Route index element={<ShopDashboard />} />
                <Route path="history" element={<div>{t('shop.history.comingSoon')}</div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
