import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  Image,
  FilePlus,
  Clock,
  TrendingDown,
  Users,
  BarChart3,
  ShieldCheck,
  QrCode,
  LogOut,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function NavigationDrawer({ isOpen, onClose, currentView, onSelectView }) {
  const { user, logout } = useAuth();
  const { lang, t } = useLanguage();

  if (!isOpen) return null;

  const menuItems = [
    { id: 'dashboard', label: t('mainDashboard'), icon: LayoutDashboard },
    { id: 'new_receipt', label: t('newAddReceipt'), icon: FilePlus },
    { id: 'unpaid_receipts', label: t('unpaidReceipts'), icon: Clock },
    {
      id: 'expenses',
      label: t('expenseManager'),
      icon: TrendingDown,
      roleRequired: (u) => u?.role === 'ADMIN' || u?.role === 'TREASURER' || u?.can_manage_expenses === 1
    },
    {
      id: 'members',
      label: t('memberPerformance'),
      icon: Users,
      roleRequired: (u) => u?.role === 'ADMIN'
    },
    {
      id: 'reports',
      label: t('financialReports'),
      icon: BarChart3,
      roleRequired: (u) => u?.role === 'ADMIN' || u?.role === 'TREASURER'
    },
    {
      id: 'audit',
      label: t('auditLog'),
      icon: ShieldCheck,
      roleRequired: (u) => u?.role === 'ADMIN'
    },
    { 
      id: 'devotee_portal', 
      label: '👁️ ' + (lang === 'mr' ? 'भाविक पोर्टल पहा (Devotee View)' : 'Devotee Portal View'), 
      icon: ExternalLink 
    }
  ];

  const handleItemClick = (id) => {
    onSelectView(id);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <aside className="drawer-panel">
        <div className="drawer-header">
          <div className="drawer-brand">
            <img src="/assets/ganesha_logo.png" alt="Ganesha" className="drawer-logo" />
            <div className="drawer-titles">
              <span className="drawer-invoc">{t('invocation')}</span>
              <span className="drawer-title">{t('mandalName')}</span>
              <span className="drawer-sub">{t('mandalLocation')}</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Drawer">
            <X size={20} color="#fed7aa" />
          </button>
        </div>

        <nav className="drawer-menu-list">
          {menuItems
            .filter((item) => !item.roleRequired || item.roleRequired(user))
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <div
                  key={item.id}
                  className={`drawer-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  id={`nav-item-${item.id}`}
                >
                  <div className="drawer-item-left">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                </div>
              );
            })}
        </nav>

        {user && (
          <div className="drawer-footer">
            <div className="drawer-user-card">
              <div className="avatar-circle">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="drawer-user-name">
                  {user.name_mr || user.name}
                </div>
                <div className="drawer-user-role">
                  +91 {user.mobile} • {user.role}
                </div>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout} id="btn-logout">
              <LogOut size={16} />
              <span>{t('logout')}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
