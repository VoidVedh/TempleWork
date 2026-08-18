import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AppHeader({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const { lang, changeLanguage, t } = useLanguage();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-btn"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          id="btn-open-nav-drawer"
        >
          <Menu size={22} />
        </button>

        <div className="header-brand">
          <img src="/assets/ganesha_logo.png" alt="Ganesha" className="header-logo" />
          <div className="brand-text-wrap">
            <span className="brand-title">{t('mandalName')}</span>
            <span className="brand-sub">{t('mandalSub')}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Realtime Status Badge */}
        <div className="realtime-pill" title="Live Database Connection Active">
          <span className="pulsing-dot"></span>
          <span>{t('realtimeBadge')}</span>
        </div>

        {/* Language Switcher */}
        <div className="lang-toggle-group">
          <button
            className={`lang-btn ${lang === 'mr' ? 'active' : ''}`}
            onClick={() => changeLanguage('mr')}
            id="btn-lang-mr"
          >
            मराठी
          </button>
          <button
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
            id="btn-lang-en"
          >
            English
          </button>
        </div>

        {/* Logged in User Pill */}
        {user && (
          <div className="user-header-badge" title={`${user.name} (${user.mobile})`}>
            <span>{user.name_mr || user.name}</span>
            <span className="role-tag-crown">
              {user.role === 'ADMIN' ? '👑 ADMIN' : '👤 MEMBER'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
