import React, { useState, useEffect } from 'react';
import { User, Receipt, Bell, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';

export default function UserDashboardView({ onNavigateToContribute, onLogout }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('receipts'); // 'receipts' | 'notifications'
  const [userReceipts, setUserReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Receipt Modal Preview
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Fetch user receipts if authenticated
      try {
        const rcptRes = await apiRequest(`/receipts?donor_mobile=${encodeURIComponent(user.mobile)}&limit=50`);
        setUserReceipts(rcptRes.receipts || []);
      } catch (e) {}

      // Fetch notifications
      try {
        const notifRes = await apiRequest('/notifications');
        setNotifications(notifRes.notifications || []);
      } catch (e) {}
    } catch (err) {
      console.error('Fetch user data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {}
  };

  if (!user) {
    return (
      <div className="section-container animate-fade-in">
        <div className="empty-state-card">
          <User size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">
            {lang === 'mr' ? 'कृपया प्रथम लॉगिन करा' : 'Please Login to Access Your Dashboard'}
          </h3>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <div className="section-container animate-fade-in">
      {/* Header with User Info Card */}
      <div className="user-profile-header-card">
        <div className="user-profile-avatar-row">
          <img src="/assets/ganesha_logo.png" alt="User Avatar" className="user-avatar-img" />
          <div className="user-profile-meta">
            <h1 className="user-name-title">{user.name_mr || user.name}</h1>
            <div className="user-role-badge-row">
              <span className="user-role-chip">
                <Shield size={14} />
                <span>{user.role}</span>
              </span>
              <span className="user-mobile-chip">📱 {user.mobile}</span>
            </div>
          </div>
        </div>

        <div className="user-quick-stats">
          <div className="quick-stat-box" onClick={() => setActiveTab('receipts')}>
            <span className="stat-count">{userReceipts.length}</span>
            <span className="stat-lbl">{lang === 'mr' ? 'पावत्या' : 'Receipts'}</span>
          </div>

          <div className="quick-stat-box" onClick={() => setActiveTab('notifications')}>
            <span className="stat-count">{unreadCount}</span>
            <span className="stat-lbl">{lang === 'mr' ? 'नवीन सूचना' : 'Unread'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="user-tabs-bar">
        {[
          { key: 'receipts', label: t('myContributions'), icon: Receipt, count: userReceipts.length },
          { key: 'notifications', label: t('myNotifications'), icon: Bell, count: unreadCount }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`user-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-bubble-count">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: My Receipts */}
      {activeTab === 'receipts' && (
        <div className="user-tab-content animate-fade-in">
          {userReceipts.length === 0 ? (
            <div className="empty-state-card">
              <Receipt size={48} className="empty-state-icon" />
              <h3>{t('noContributionsYet')}</h3>
            </div>
          ) : (
            <div className="user-receipts-table-card">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>पावती क्र. (Receipt No)</th>
                    <th>दात्याचे नाव (Donor)</th>
                    <th>रक्कम (Amount)</th>
                    <th>तारीख (Date)</th>
                    <th>पद्धत (Mode)</th>
                    <th>प्रमाणपत्र (Certificate)</th>
                  </tr>
                </thead>
                <tbody>
                  {userReceipts.map(r => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-maroon">{r.receipt_no}</td>
                      <td>{r.donor_name}</td>
                      <td className="font-bold">₹ {Number(r.amount).toLocaleString('en-IN')}</td>
                      <td>{r.issue_date ? r.issue_date.slice(0, 10) : ''}</td>
                      <td>{r.payment_mode}</td>
                      <td>
                        <button 
                          className="btn-sm btn-outline-gold"
                          onClick={() => setSelectedReceipt(r)}
                        >
                          📜 प्रमाणपत्र पहा
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="user-tab-content animate-fade-in">
          {notifications.length === 0 ? (
            <div className="empty-state-card">
              <Bell size={48} className="empty-state-icon" />
              <h3>{t('noNotificationsYet')}</h3>
            </div>
          ) : (
            <div className="notifications-feed-list">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`notification-feed-item ${n.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleMarkNotificationRead(n.id)}
                >
                  <div className="notif-indicator-dot" />
                  <div className="notif-feed-content">
                    <h4 className="notif-feed-title">
                      {lang === 'en' ? (n.title_en || n.title_mr) : lang === 'hi' ? (n.title_hi || n.title_mr) : n.title_mr}
                    </h4>
                    <p className="notif-feed-msg">
                      {lang === 'en' ? (n.message_en || n.message_mr) : lang === 'hi' ? (n.message_hi || n.message_mr) : n.message_mr}
                    </p>
                    <span className="notif-feed-time">📅 {n.created_at ? n.created_at.slice(0, 10) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Receipt Certificate Preview Modal */}
      {selectedReceipt && (
        <ReceiptCertificateModal
          isOpen={Boolean(selectedReceipt)}
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
