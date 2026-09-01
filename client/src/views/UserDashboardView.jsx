import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Receipt, Bell, Shield, Download, 
  CheckCircle, Clock, AlertCircle, Sparkles, ChevronRight, LogOut 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';

export default function UserDashboardView({ onNavigateToContribute, onNavigateToEvents, onLogout }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'receipts' | 'notifications'
  const [registrations, setRegistrations] = useState([]);
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
      // Fetch registrations for user mobile
      const regRes = await apiRequest(`/public/events/my-registrations?mobile=${user.mobile || ''}`);
      setRegistrations(regRes.registrations || []);

      // Fetch user receipts if authenticated
      try {
        const rcptRes = await apiRequest('/receipts?limit=50');
        const list = rcptRes.receipts || [];
        // Filter by user mobile or name
        const myRcpts = list.filter(r => r.donor_mobile === user.mobile || r.collector_id === user.id);
        setUserReceipts(myRcpts);
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
          <div className="quick-stat-box" onClick={() => setActiveTab('events')}>
            <span className="stat-count">{registrations.length}</span>
            <span className="stat-lbl">{lang === 'mr' ? 'नोंदणीकृत कार्यक्रम' : 'Events'}</span>
          </div>

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
          { key: 'overview', label: t('myOverview'), icon: User },
          { key: 'events', label: t('myRegistrations'), icon: Calendar, count: registrations.length },
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

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="user-tab-content animate-fade-in">
          <div className="user-overview-grid">
            {/* Recent Registered Events Card */}
            <div className="overview-card">
              <div className="overview-card-header">
                <h3>📅 {lang === 'mr' ? 'आगामी उत्सव उपस्थिती' : 'Upcoming Registrations'}</h3>
                {onNavigateToEvents && (
                  <button className="btn-text-link" onClick={onNavigateToEvents}>
                    {lang === 'mr' ? 'सर्व कार्यक्रम ->' : 'View All Events ->'}
                  </button>
                )}
              </div>

              {registrations.length === 0 ? (
                <div className="empty-sub-state">
                  <p>{t('noRegistrationsYet')}</p>
                  {onNavigateToEvents && (
                    <button className="btn-secondary btn-sm mt-2" onClick={onNavigateToEvents}>
                      {lang === 'mr' ? 'कार्यक्रम पहा व नोंदणी करा' : 'Browse Events'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="registrations-compact-list">
                  {registrations.slice(0, 3).map(r => (
                    <div key={r.id} className="registration-compact-item">
                      <div className="reg-item-meta">
                        <h4>{r.title_mr || r.title_en}</h4>
                        <div className="reg-item-sub">📅 {r.date} | ⏰ {r.start_time} | 📍 {r.venue_mr}</div>
                      </div>
                      <div className="reg-token-badge">{r.qr_code_token}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official Receipts Card */}
            <div className="overview-card">
              <div className="overview-card-header">
                <h3>📜 {lang === 'mr' ? 'माझी अधिकृत पावती प्रमाणपत्रे' : 'My Verified Receipts'}</h3>
                {onNavigateToContribute && (
                  <button className="btn-text-link" onClick={onNavigateToContribute}>
                    {lang === 'mr' ? '+ वर्गणी भरा' : '+ Pay Vargani'}
                  </button>
                )}
              </div>

              {userReceipts.length === 0 ? (
                <div className="empty-sub-state">
                  <p>{t('noContributionsYet')}</p>
                </div>
              ) : (
                <div className="receipts-compact-list">
                  {userReceipts.slice(0, 3).map(r => (
                    <div key={r.id} className="receipt-compact-item" onClick={() => setSelectedReceipt(r)}>
                      <div className="receipt-item-info">
                        <span className="rcpt-no">{r.receipt_no}</span>
                        <span className="rcpt-donor">{r.donor_name}</span>
                        <span className="rcpt-date">📅 {r.issue_date ? r.issue_date.slice(0, 10) : ''}</span>
                      </div>
                      <div className="receipt-item-amount">
                        <span className="amt-val">₹ {Number(r.amount).toLocaleString('en-IN')}</span>
                        <span className="amt-badge">{r.payment_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Event Registrations */}
      {activeTab === 'events' && (
        <div className="user-tab-content animate-fade-in">
          {registrations.length === 0 ? (
            <div className="empty-state-card">
              <Calendar size={48} className="empty-state-icon" />
              <h3>{t('noRegistrationsYet')}</h3>
              {onNavigateToEvents && (
                <button className="btn-primary mt-3" onClick={onNavigateToEvents}>
                  {lang === 'mr' ? 'उत्सव व कार्यक्रम पहा' : 'View Events'}
                </button>
              )}
            </div>
          ) : (
            <div className="registrations-full-grid">
              {registrations.map(r => (
                <div key={r.id} className="digital-pass-card">
                  <div className="pass-card-top">
                    <div>
                      <span className="pass-badge-mandal">🚩 श्री सिद्धिविनायक मंदिर</span>
                      <h3 className="pass-event-title">{r.title_mr || r.title_en}</h3>
                    </div>
                    <div className="pass-qr-token">{r.qr_code_token}</div>
                  </div>

                  <div className="pass-card-details">
                    <div className="pass-detail-cell">
                      <span className="cell-lbl">{lang === 'mr' ? 'उपस्थिती नाव:' : 'Attendee:'}</span>
                      <span className="cell-val">{r.attendee_name}</span>
                    </div>

                    <div className="pass-detail-cell">
                      <span className="cell-lbl">{lang === 'mr' ? 'व्यक्ती संख्या:' : 'Guests:'}</span>
                      <span className="cell-val">{r.guests_count} {lang === 'mr' ? 'व्यक्ती' : 'Person(s)'}</span>
                    </div>

                    <div className="pass-detail-cell">
                      <span className="cell-lbl">{lang === 'mr' ? 'तारीख व वेळ:' : 'Date & Time:'}</span>
                      <span className="cell-val">{r.date} ({r.start_time})</span>
                    </div>

                    <div className="pass-detail-cell">
                      <span className="cell-lbl">{lang === 'mr' ? 'ठिकाण:' : 'Venue:'}</span>
                      <span className="cell-val">{r.venue_mr}</span>
                    </div>
                  </div>

                  <div className="pass-card-bottom">
                    <span className="pass-status-confirmed">✅ {lang === 'mr' ? 'नोंदणी निश्चित (Confirmed)' : 'Confirmed Pass'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Receipts */}
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
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
