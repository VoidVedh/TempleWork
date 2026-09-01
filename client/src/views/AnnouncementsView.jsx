import React, { useState, useEffect } from 'react';
import { Bell, Calendar, User, AlertTriangle, Info, Sparkles, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../utils/api';

export default function AnnouncementsView({ onNavigateToEvents }) {
  const { lang, t } = useLanguage();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/public/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Fetch announcements error:', err);
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = announcements.filter(a => {
    if (filterPriority !== 'ALL' && a.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT': return 'badge-urgent';
      case 'IMPORTANT': return 'badge-important';
      default: return 'badge-normal';
    }
  };

  return (
    <div className="section-container animate-fade-in">
      {/* Header */}
      <div className="section-header-banner">
        <div className="section-header-text">
          <div className="section-pretitle">॥ अधिकृत परिपत्रक ॥</div>
          <h1 className="section-title">{t('announcementsTitle')}</h1>
          <p className="section-subtitle">{t('announcementsSubtitle')}</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="filter-search-row">
        <div className="status-filter-pills">
          {['ALL', 'URGENT', 'IMPORTANT', 'NORMAL'].map(p => (
            <button
              key={p}
              className={`filter-pill-btn ${filterPriority === p ? 'active' : ''}`}
              onClick={() => setFilterPriority(p)}
            >
              {p === 'ALL' && (lang === 'mr' ? 'सर्व सूचना' : lang === 'hi' ? 'सभी सूचनाएं' : 'All Notices')}
              {p === 'URGENT' && (lang === 'mr' ? '🚨 तातडीचे (Urgent)' : '🚨 Urgent')}
              {p === 'IMPORTANT' && (lang === 'mr' ? '⭐ महत्त्वाचे' : '⭐ Important')}
              {p === 'NORMAL' && (lang === 'mr' ? 'सामान्य' : 'General')}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-box skeleton-announcement-card" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="error-alert-box">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchAnnouncements}>पुन्हा प्रयत्न करा (Retry)</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state-card">
          <Bell size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">
            {lang === 'mr' ? 'कोणतीही सूचना उपलब्ध नाही' : 'No announcements currently available'}
          </h3>
        </div>
      )}

      {/* Announcements List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="announcements-list-wrapper">
          {filtered.map(item => {
            const isUrgent = item.priority === 'URGENT';
            const isImportant = item.priority === 'IMPORTANT';

            return (
              <div 
                key={item.id} 
                className={`announcement-card-item ${isUrgent ? 'announcement-urgent-border' : isImportant ? 'announcement-important-border' : ''}`}
              >
                <div className="announcement-card-header">
                  <div className="announcement-badge-group">
                    <span className={`announcement-priority-pill ${getPriorityBadgeClass(item.priority)}`}>
                      {isUrgent && '🚨 '}
                      {isImportant && '⭐ '}
                      {item.priority}
                    </span>

                    {item.status && (
                      <span className="announcement-status-pill">{item.status}</span>
                    )}
                  </div>

                  <div className="announcement-publish-date">
                    <Calendar size={14} />
                    <span>{item.published_at ? item.published_at.slice(0, 10) : 'Active'}</span>
                  </div>
                </div>

                <h3 className="announcement-item-title">
                  {lang === 'en' ? (item.title_en || item.title_mr) : lang === 'hi' ? (item.title_hi || item.title_mr) : item.title_mr}
                </h3>

                <p className="announcement-item-content">
                  {lang === 'en' ? (item.content_en || item.content_mr) : lang === 'hi' ? (item.content_hi || item.content_mr) : item.content_mr}
                </p>

                <div className="announcement-card-footer">
                  <div className="announcement-author-info">
                    <User size={14} />
                    <span>{item.author_name || (lang === 'mr' ? 'मंडळ प्रशासन' : 'Temple Admin')}</span>
                  </div>

                  {item.related_event_id && (
                    <button 
                      className="btn-text-link"
                      onClick={() => onNavigateToEvents && onNavigateToEvents(item.related_event_id)}
                    >
                      <span>{lang === 'mr' ? 'संबंधित कार्यक्रम पहा' : 'View Related Event'}</span>
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
