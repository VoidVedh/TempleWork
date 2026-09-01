import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { DataProvider } from './context/DataContext';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AppHeader from './components/layout/AppHeader';
import NavigationDrawer from './components/layout/NavigationDrawer';

import PublicDevoteePortalView from './views/PublicDevoteePortalView';
import EventsView from './views/EventsView';
import AnnouncementsView from './views/AnnouncementsView';
import AboutView from './views/AboutView';
import ContactView from './views/ContactView';
import PayVarganiView from './views/PayVarganiView';
import UserDashboardView from './views/UserDashboardView';
import LoginView from './views/LoginView';

// Admin Suite Views
import DashboardView from './views/DashboardView';
import AdminEventManagerView from './views/AdminEventManagerView';
import AdminAnnouncementManagerView from './views/AdminAnnouncementManagerView';
import NewReceiptView from './views/NewReceiptView';
import UnpaidReceiptsView from './views/UnpaidReceiptsView';
import ExpenseManagerView from './views/ExpenseManagerView';
import MemberPerformanceView from './views/MemberPerformanceView';
import ReportsView from './views/ReportsView';
import AuditLogView from './views/AuditLogView';

const PUBLIC_VIEWS = ['devotee_portal', 'events', 'announcements', 'pay_vargani', 'about', 'contact'];

function MainApp() {
  const { user, loading, logout } = useAuth();
  const { lang, t } = useLanguage();

  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && (PUBLIC_VIEWS.includes(hash) || hash === 'user_dashboard' || hash === 'dashboard')) {
      return hash;
    }
    return 'devotee_portal';
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Sync route with URL hash for stable deep linking & browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (viewKey) => {
    setCurrentView(viewKey);
    window.location.hash = viewKey;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfaf6', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/assets/ganesha_logo.png" alt="Ganesha" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px', border: '3px solid #d97706' }} />
          <div style={{ color: '#7f1d1d', fontWeight: 800, fontSize: '18px' }}>श्री सिद्धिविनायक मंदिर</div>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>सिस्टम सुरू होत आहे (Loading)...</div>
        </div>
      </div>
    );
  }

  const isPublicView = PUBLIC_VIEWS.includes(currentView);

  // 1. PUBLIC & DEVOTEE PORTAL PAGES
  if (isPublicView) {
    return (
      <div className="site-wrapper">
        <Navbar
          currentView={currentView}
          onSelectView={navigateTo}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onOpenUserDashboard={() => navigateTo('user_dashboard')}
        />

        <main className="public-main-content">
          {currentView === 'devotee_portal' && (
            <PublicDevoteePortalView
              onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
              onNavigateAdmin={() => navigateTo('dashboard')}
              onNavigateEvents={() => navigateTo('events')}
              onNavigateGallery={() => navigateTo('gallery')}
              onNavigateAnnouncements={() => navigateTo('announcements')}
              onNavigateAbout={() => navigateTo('about')}
              onNavigateContact={() => navigateTo('contact')}
            />
          )}

          {currentView === 'events' && (
            <EventsView
              onNavigateToContribute={() => navigateTo('pay_vargani')}
              onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            />
          )}

          {currentView === 'announcements' && (
            <AnnouncementsView
              onNavigateToEvents={() => navigateTo('events')}
            />
          )}

          {currentView === 'pay_vargani' && (
            <PayVarganiView
              onNavigate={navigateTo}
            />
          )}

          {currentView === 'about' && (
            <AboutView
              onNavigateToContribute={() => navigateTo('pay_vargani')}
            />
          )}

          {currentView === 'contact' && <ContactView />}
        </main>

        <Footer
          onSelectView={navigateTo}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        />

        {/* Login Modal */}
        {isAdminLoginModalOpen && !user && (
          <LoginView
            isModal={true}
            onClose={() => setIsAdminLoginModalOpen(false)}
            onBackToPublic={() => setIsAdminLoginModalOpen(false)}
          />
        )}
      </div>
    );
  }

  // 2. AUTHENTICATED USER DASHBOARD
  if (currentView === 'user_dashboard') {
    return (
      <div className="site-wrapper">
        <Navbar
          currentView={currentView}
          onSelectView={navigateTo}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onOpenUserDashboard={() => navigateTo('user_dashboard')}
        />

        <main className="public-main-content">
          <UserDashboardView
            onNavigateToContribute={() => navigateTo('pay_vargani')}
            onNavigateToEvents={() => navigateTo('events')}
            onLogout={logout}
          />
        </main>

        <Footer
          onSelectView={navigateTo}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        />
      </div>
    );
  }

  // 3. ADMIN & COMMITTEE MANAGEMENT SUITE (Requires Auth)
  const canAccessAdmin = (view) => {
    if (!user) return false;
    switch (view) {
      case 'admin_events':
        return user.role === 'ADMIN' || user.role === 'EVENT_MANAGER';
      case 'admin_announcements':
        return user.role === 'ADMIN' || user.role === 'CONTENT_MANAGER';
      case 'expenses':
        return user.role === 'ADMIN' || user.role === 'TREASURER' || user.can_manage_expenses === 1;
      case 'members':
      case 'reports':
      case 'audit':
        return user.role === 'ADMIN';
      default:
        return true;
    }
  };

  const renderAdminView = () => {
    const effectiveView = canAccessAdmin(currentView) ? currentView : 'dashboard';

    switch (effectiveView) {
      case 'dashboard':
        return <DashboardView onNavigate={navigateTo} />;
      case 'admin_events':
        return <AdminEventManagerView />;
      case 'admin_announcements':
        return <AdminAnnouncementManagerView />;
      case 'pay_vargani':
        return <PayVarganiView onNavigate={navigateTo} />;
      case 'new_receipt':
        return <NewReceiptView onNavigate={navigateTo} />;
      case 'unpaid_receipts':
        return <UnpaidReceiptsView onNavigate={navigateTo} />;
      case 'expenses':
        return <ExpenseManagerView />;
      case 'members':
        return <MemberPerformanceView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <DashboardView onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="app-container">
      <AppHeader
        onOpenMenu={() => setIsDrawerOpen(true)}
        onSwitchToDevoteeView={() => navigateTo('devotee_portal')}
      />

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        onSelectView={navigateTo}
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
