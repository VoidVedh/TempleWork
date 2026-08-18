import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { DataProvider } from './context/DataContext';

import AppHeader from './components/layout/AppHeader';
import NavigationDrawer from './components/layout/NavigationDrawer';

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfaf6', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/assets/ganesha_logo.png" alt="Ganesha" style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '12px' }} />
          <div style={{ color: '#7f1d1d', fontWeight: 800, fontSize: '16px' }}>एकदंत मित्र मंडळ, उचगाव</div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>सिस्टम सुरू होत आहे...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (currentView) {
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
      <AppHeader onOpenMenu={() => setIsDrawerOpen(true)} />

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
      />

      <main className="main-content">
        {renderView()}
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
