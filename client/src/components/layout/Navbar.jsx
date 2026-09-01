import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Globe, User, Shield, Bell, Heart, 
  Calendar, Image, FileText, Info, Phone, LogIn, ChevronDown 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';

export default function Navbar({ 
  currentView, 
  onSelectView, 
  onOpenAdminLogin,
  onOpenUserDashboard 
}) {
  const { lang, changeLanguage, t } = useLanguage();
  const { user, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotificationsCount = async () => {
    try {
      const res = await apiRequest('/notifications');
      setUnreadNotifCount(res.unreadCount || 0);
    } catch (e) {}
  };

  const navLinks = [
    { key: 'devotee_portal', label: t('navHome'), icon: Heart },
    { key: 'pay_vargani', label: t('navContribute'), icon: Heart, highlight: true },
    { key: 'contact', label: t('navContact'), icon: Phone }
  ];

  const handleNavClick = (viewKey) => {
    onSelectView(viewKey);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="site-navbar-header">
      {/* Top Auspicious Invocatory Strip */}
      <div className="navbar-top-strip">
        <div className="top-strip-inner">
          <div className="top-strip-left">
            <span>🚩 {t('invocation')}</span>
            <span className="top-strip-divider">•</span>
            <span>{lang === 'mr' ? 'ऐरोली सेक्टर-५, नवी मुंबई' : 'Airoli Sector-5, Navi Mumbai'}</span>
            <span className="top-strip-divider">•</span>
            <span>{t('regNo')}</span>
          </div>

          <div className="top-strip-right">
            {/* Language Selector */}
            <div className="lang-selector-group">
              <Globe size={13} className="lang-icon" />
              <button 
                className={`lang-btn ${lang === 'mr' ? 'active' : ''}`}
                onClick={() => changeLanguage('mr')}
              >
                मराठी
              </button>
              <span className="lang-sep">|</span>
              <button 
                className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
                onClick={() => changeLanguage('hi')}
              >
                हिंदी
              </button>
              <span className="lang-sep">|</span>
              <button 
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => changeLanguage('en')}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <div className="navbar-main-row">
        <div className="navbar-inner-container">
          {/* Brand Logo & Title */}
          <div className="navbar-brand-section" onClick={() => handleNavClick('devotee_portal')}>
            <img 
              src="/assets/ganesha_logo.png" 
              alt="Shree Siddhivinayak Mandir Logo" 
              className="navbar-brand-logo animate-pulse-subtle"
            />
            <div className="navbar-brand-text">
              <h1 className="navbar-brand-title">{t('mandalName')}</h1>
              <span className="navbar-brand-subtitle">{t('mandalSub')} • एकदंत मित्र मंडळ</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="navbar-desktop-nav">
            {navLinks.map(link => {
              const isActive = currentView === link.key;
              return (
                <button
                  key={link.key}
                  className={`nav-link-btn ${isActive ? 'active' : ''} ${link.highlight ? 'nav-link-highlight' : ''}`}
                  onClick={() => handleNavClick(link.key)}
                >
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Login */}
          <div className="navbar-actions-group">
            {/* Notifications Button if user logged in */}
            {user && (
              <button 
                className="nav-icon-circle-btn"
                title={t('navNotifications')}
                onClick={() => handleNavClick('user_dashboard')}
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && (
                  <span className="nav-notif-dot">{unreadNotifCount}</span>
                )}
              </button>
            )}

            {/* Authenticated User / Admin Button */}
            {user ? (
              <div className="user-logged-nav-chip">
                <button 
                  className="btn-user-profile-nav"
                  onClick={() => handleNavClick(user.role === 'ADMIN' ? 'dashboard' : 'user_dashboard')}
                >
                  <Shield size={15} />
                  <span className="user-nav-name">{user.name_mr ? user.name_mr.split(' ')[0] : user.name.split(' ')[0]}</span>
                  <span className="user-nav-role">({user.role === 'ADMIN' ? 'Admin' : 'Member'})</span>
                </button>
                <button 
                  className="btn-logout-nav" 
                  title={t('logout')} 
                  onClick={logout}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button className="btn-admin-login-navbar" onClick={onOpenAdminLogin}>
                <LogIn size={15} />
                <span>{t('adminLogin')}</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button 
              className="navbar-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-drawer animate-slide-down">
          <div className="mobile-drawer-links">
            {navLinks.map(link => {
              const isActive = currentView === link.key;
              const Icon = link.icon;
              return (
                <button
                  key={link.key}
                  className={`mobile-nav-link-btn ${isActive ? 'active' : ''} ${link.highlight ? 'mobile-highlight' : ''}`}
                  onClick={() => handleNavClick(link.key)}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </button>
              );
            })}

            {user && (
              <button
                className={`mobile-nav-link-btn ${currentView === 'user_dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('user_dashboard')}
              >
                <User size={18} />
                <span>{t('navUserDashboard')}</span>
              </button>
            )}

            {user && user.role === 'ADMIN' && (
              <button
                className={`mobile-nav-link-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <Shield size={18} />
                <span>{t('navAdminPortal')}</span>
              </button>
            )}
          </div>

          <div className="mobile-drawer-footer">
            <div className="mobile-lang-row">
              <span className="text-xs text-muted">भाषा (Language):</span>
              <button className={`lang-pill ${lang === 'mr' ? 'active' : ''}`} onClick={() => changeLanguage('mr')}>मराठी</button>
              <button className={`lang-pill ${lang === 'hi' ? 'active' : ''}`} onClick={() => changeLanguage('hi')}>हिंदी</button>
              <button className={`lang-pill ${lang === 'en' ? 'active' : ''}`} onClick={() => changeLanguage('en')}>English</button>
            </div>

            {!user ? (
              <button className="btn-primary btn-block mt-3" onClick={() => { setIsMobileMenuOpen(false); onOpenAdminLogin(); }}>
                <LogIn size={16} />
                <span>{t('adminLogin')}</span>
              </button>
            ) : (
              <button className="btn-secondary btn-block mt-3" onClick={logout}>
                <span>{t('logout')} ({user.name})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
