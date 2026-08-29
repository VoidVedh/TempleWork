import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { DataProvider } from './context/DataContext';

import AppHeader from './components/layout/AppHeader';
import NavigationDrawer from './components/layout/NavigationDrawer';

import PublicDevoteePortalView from './views/PublicDevoteePortalView';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import NewReceiptView from './views/NewReceiptView';
import UnpaidReceiptsView from './views/UnpaidReceiptsView';
import ExpenseManagerView from './views/ExpenseManagerView';
import MemberPerformanceView from './views/MemberPerformanceView';
import ReportsView from './views/ReportsView';
import AuditLogView from './views/AuditLogView';
import PayVarganiView from './views/PayVarganiView';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Sync default view when auth state changes
  useEffect(() => {
    if (user) {
      setIsAdminLoginModalOpen(false);
      setCurrentView('dashboard');
    } else {
      setCurrentView('devotee_portal');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfaf6', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/assets/ganesha_logo.png" alt="Ganesha" style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '12px' }} />
          <div style={{ color: '#7f1d1d', fontWeight: 800, fontSize: '16px' }}>श्री सिद्धिविनायक मंदिर</div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>सिस्टम सुरू होत आहे...</div>
        </div>
      </div>
    );
  }

  // 1. PUBLIC DEVOTEE PORTAL (Default when unauthenticated or when requested by logged in user)
  if (!user || currentView === 'devotee_portal') {
    return (
      <>
        <PublicDevoteePortalView
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onNavigateAdmin={() => setCurrentView('dashboard')}
        />

        {isAdminLoginModalOpen && !user && (
          <LoginView
            isModal={true}
            onClose={() => setIsAdminLoginModalOpen(false)}
            onBackToPublic={() => setIsAdminLoginModalOpen(false)}
          />
        )}
      </>
    );
  }

  // 2. ADMIN & COMMITTEE MANAGEMENT SUITE
  const canAccessView = (view) => {
    if (!user) return false;
    switch (view) {
      case 'expenses':
        return user.role === 'ADMIN' || user.can_manage_expenses === 1;
      case 'members':
      case 'reports':
      case 'audit':
        return user.role === 'ADMIN';
      default:
        return true;
    }
  };

  const renderAdminView = () => {
    const effectiveView = canAccessView(currentView) ? currentView : 'dashboard';

    switch (effectiveView) {
      case 'dashboard':
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
      case 'pay_vargani':
        return <PayVarganiView onNavigate={(view) => setCurrentView(view)} />;
      case 'new_receipt':
        return <NewReceiptView onNavigate={(view) => setCurrentView(view)} />;
      case 'unpaid_receipts':
        return <UnpaidReceiptsView onNavigate={(view) => setCurrentView(view)} />;
      case 'expenses':
        return <ExpenseManagerView />;
      case 'members':
        return <MemberPerformanceView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <DashboardView onNavigate={(view) => setCurrentView(view)} />;
    }
  };

  return (
    <div className="app-container">
      <AppHeader
        onOpenMenu={() => setIsDrawerOpen(true)}
        onSwitchToDevoteeView={() => setCurrentView('devotee_portal')}
      />

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
      />

      <main className="main-content">
        {renderAdminView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
