import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, Clock, Users, CheckCircle, Share2, 
  ExternalLink, Download, Search, AlertCircle, X, Sparkles, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { downloadIcsFile, generateGoogleCalendarUrl } from '../utils/calendarUtils';

export default function EventsView({ onNavigateToContribute, onOpenAdminLogin }) {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Registration Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeMobile, setAttendeeMobile] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessData, setRegSuccessData] = useState(null);

  // My registered events map (to show badge)
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  useEffect(() => {
    fetchEvents();
    if (user) {
      setAttendeeName(user.name_mr || user.name || '');
      setAttendeeMobile(user.mobile || '');
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/public/events');
      setEvents(data.events || []);
    } catch (err) {
      console.error('Fetch events error:', err);
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegistration = (event) => {
    setSelectedEvent(event);
    setRegError('');
    setRegSuccessData(null);
    if (user) {
      setAttendeeName(user.name_mr || user.name || '');
      setAttendeeMobile(user.mobile || '');
    } else {
      setAttendeeName('');
      setAttendeeMobile('');
    }
    setGuestsCount(1);
  };

  const handleCloseRegistration = () => {
    setSelectedEvent(null);
    setRegError('');
    setRegSuccessData(null);
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeMobile.trim()) {
      setRegError(lang === 'mr' ? 'कृपया नाव आणि मोबाईल नंबर भरा.' : 'Please enter name and mobile number.');
      return;
    }

    try {
      setSubmittingReg(true);
      setRegError('');
      const res = await apiRequest('/public/events/register', {
        method: 'POST',
        body: JSON.stringify({
          event_id: selectedEvent.id,
          attendee_name: attendeeName.trim(),
          attendee_mobile: attendeeMobile.trim(),
          attendee_email: attendeeEmail.trim() || undefined,
          guests_count: guestsCount
        })
      });

      if (res.success && res.registration) {
        setRegSuccessData(res.registration);
        setRegisteredEventIds(prev => new Set(prev).add(selectedEvent.id));
        // Refresh event capacity
        fetchEvents();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegError(err.message || 'Registration failed.');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleShareEvent = (event) => {
    const title = event.title_mr || event.title_en;
    const text = `🚩 *${title}*\n📅 ${event.date} | ⏰ ${event.start_time}\n📍 ${event.venue_mr}\n\nश्री सिद्धिविनायक मंदिर, ऐरोली`;
    if (navigator.share) {
      navigator.share({ title, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      alert(lang === 'mr' ? 'कार्यक्रमाची माहिती कॉपी झाली आहे!' : 'Event details copied to clipboard!');
    }
  };

  const filteredEvents = events.filter(evt => {
    if (filterStatus !== 'ALL' && evt.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (evt.title_mr && evt.title_mr.toLowerCase().includes(q)) ||
                         (evt.title_en && evt.title_en.toLowerCase().includes(q)) ||
                         (evt.venue_mr && evt.venue_mr.toLowerCase().includes(q));
      if (!matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="section-container animate-fade-in">
      {/* View Header */}
      <div className="section-header-banner">
        <div className="section-header-text">
          <div className="section-pretitle">॥ श्री गणेशाय नमः ॥</div>
          <h1 className="section-title">{t('eventsTitle')}</h1>
          <p className="section-subtitle">{t('eventsSubtitle')}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-search-row">
        <div className="status-filter-pills">
          {['ALL', 'UPCOMING', 'LIVE', 'COMPLETED'].map(status => (
            <button
              key={status}
              className={`filter-pill-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'ALL' && (lang === 'mr' ? 'सर्व कार्यक्रम' : lang === 'hi' ? 'सभी कार्यक्रम' : 'All Events')}
              {status === 'UPCOMING' && (lang === 'mr' ? '🚩 आगामी' : lang === 'hi' ? '🚩 आगामी' : 'Upcoming')}
              {status === 'LIVE' && (lang === 'mr' ? '🔴 चालू (Live)' : lang === 'hi' ? '🔴 चालू' : 'Live Now')}
              {status === 'COMPLETED' && (lang === 'mr' ? '✅ संपन्न' : lang === 'hi' ? '✅ संपन्न' : 'Completed')}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input-field"
            placeholder={lang === 'mr' ? 'कार्यक्रम किंवा ठिकाण शोधा...' : lang === 'hi' ? 'कार्यक्रम या स्थान खोजें...' : 'Search events or venues...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="event-card-skeleton">
              <div className="skeleton-box skeleton-banner" />
              <div className="skeleton-content">
                <div className="skeleton-box skeleton-line skeleton-title" />
                <div className="skeleton-box skeleton-line" />
                <div className="skeleton-box skeleton-line skeleton-short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="error-alert-box">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchEvents}>पुन्हा प्रयत्न करा (Retry)</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className="empty-state-card">
          <Calendar size={48} className="empty-state-icon" />
          <h3 className="empty-state-title">
            {lang === 'mr' ? 'कोणताही कार्यक्रम आढळला नाही' : lang === 'hi' ? 'कोई कार्यक्रम नहीं मिला' : 'No events found'}
          </h3>
          <p className="empty-state-desc">
            {lang === 'mr' ? 'कृपया फिल्टर बदला किंवा नंतर तपासा.' : 'Please adjust your filter or check back soon.'}
          </p>
        </div>
      )}

      {/* Events Grid */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="events-grid">
          {filteredEvents.map(event => {
            const isLive = event.status === 'LIVE';
            const isCompleted = event.status === 'COMPLETED';
            const isCancelled = event.status === 'CANCELLED';
            const isRegistered = registeredEventIds.has(event.id);
            const isFull = event.capacity > 0 && event.registered_count >= event.capacity;
            const spotsRemaining = event.capacity > 0 ? Math.max(0, event.capacity - event.registered_count) : null;

            return (
              <div key={event.id} className={`event-card-item ${isLive ? 'event-card-live' : ''}`}>
                {/* Top Badge & Date Strip */}
                <div className="event-card-header">
                  <div className="event-date-badge">
                    <Calendar size={14} />
                    <span>{event.date}</span>
                  </div>

                  <span className={`event-status-pill status-${event.status.toLowerCase()}`}>
                    {isLive && '🔴 '}
                    {event.status}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="event-card-body">
                  <h3 className="event-item-title">
                    {lang === 'en' ? (event.title_en || event.title_mr) : lang === 'hi' ? (event.title_hi || event.title_mr) : event.title_mr}
                  </h3>

                  <p className="event-item-desc">
                    {lang === 'en' ? (event.description_en || event.description_mr) : lang === 'hi' ? (event.description_hi || event.description_mr) : event.description_mr}
                  </p>

                  {/* Metadata Chips */}
                  <div className="event-meta-list">
                    <div className="event-meta-item">
                      <Clock size={15} className="meta-icon" />
                      <span>{event.start_time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                    </div>

                    <div className="event-meta-item">
                      <MapPin size={15} className="meta-icon" />
                      <span>{lang === 'en' ? (event.venue_en || event.venue_mr) : event.venue_mr}</span>
                    </div>

                    {event.capacity > 0 && (
                      <div className={`event-meta-item ${isFull ? 'meta-full' : ''}`}>
                        <Users size={15} className="meta-icon" />
                        <span>
                          {isFull 
                            ? (lang === 'mr' ? 'जागा पूर्ण (Housefull)' : 'Housefull') 
                            : `${spotsRemaining} ${t('spotsLeft')}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="event-card-footer">
                  {/* Register Button */}
                  {!isCompleted && !isCancelled && event.registration_enabled ? (
                    <button 
                      className={`btn-event-register ${isRegistered ? 'btn-registered' : isFull ? 'btn-disabled' : ''}`}
                      disabled={isRegistered || isFull}
                      onClick={() => handleOpenRegistration(event)}
                    >
                      {isRegistered ? t('btnRegistered') : isFull ? t('housefull') : t('btnRegister')}
                    </button>
                  ) : null}

                  <div className="event-quick-actions">
                    {/* Calendar Dropdown / Button */}
                    <button 
                      className="btn-event-icon" 
                      title={t('btnAddToCalendar')}
                      onClick={() => downloadIcsFile(event)}
                    >
                      <Download size={16} />
                    </button>

                    <a 
                      href={generateGoogleCalendarUrl(event)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-event-icon"
                      title="Google Calendar"
                    >
                      <ExternalLink size={16} />
                    </a>

                    {/* Share Button */}
                    <button 
                      className="btn-event-icon" 
                      title={t('btnShare')}
                      onClick={() => handleShareEvent(event)}
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Attendance Registration Modal */}
      {selectedEvent && (
        <div className="modal-backdrop animate-fade-in" onClick={handleCloseRegistration}>
          <div className="modal-window registration-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Sparkles size={18} className="gold-icon" />
                <span>{t('eventRegistrationTitle')}</span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseRegistration}>
                <X size={18} />
              </button>
            </div>

            {!regSuccessData ? (
              <form onSubmit={handleSubmitRegistration} className="modal-body registration-form">
                <div className="event-summary-strip">
                  <div className="summary-title">{selectedEvent.title_mr}</div>
                  <div className="summary-meta">📅 {selectedEvent.date} | ⏰ {selectedEvent.start_time}</div>
                  <div className="summary-meta">📍 {selectedEvent.venue_mr}</div>
                </div>

                {regError && (
                  <div className="error-alert-banner">
                    <AlertCircle size={16} />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('attendeeName')} *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="उदा. राहुल शांताराम कदम"
                    value={attendeeName}
                    onChange={e => setAttendeeName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('attendeeMobile')} *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    className="form-control"
                    placeholder="9820123456"
                    value={attendeeMobile}
                    onChange={e => setAttendeeMobile(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">{t('guestsCount')}</label>
                    <select
                      className="form-control"
                      value={guestsCount}
                      onChange={e => setGuestsCount(parseInt(e.target.value, 10))}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                        <option key={n} value={n}>{n} {lang === 'mr' ? 'व्यक्ती' : 'Person(s)'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('attendeeEmail')}</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="devotee@gmail.com"
                      value={attendeeEmail}
                      onChange={e => setAttendeeEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button type="button" className="btn-secondary" onClick={handleCloseRegistration}>
                    {lang === 'mr' ? 'रद्द करा' : 'Cancel'}
                  </button>
                  <button type="submit" className="btn-primary" disabled={submittingReg}>
                    {submittingReg ? (lang === 'mr' ? 'नोंदणी होत आहे...' : 'Registering...') : t('submitRegistration')}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Confirmation Card */
              <div className="modal-body success-confirmation-box">
                <CheckCircle size={48} className="success-icon animate-bounce" />
                <h3 className="success-heading">{t('registrationSuccess')}</h3>
                <p className="success-subheading">
                  {lang === 'mr' ? 'आपला डिजिटल प्रवेश पास तयार झाला आहे.' : 'Your digital entry pass is generated.'}
                </p>

                <div className="pass-digital-card">
                  <div className="pass-header">
                    <span>🚩 श्री सिद्धिविनायक मंदिर</span>
                    <span className="pass-token">{regSuccessData.qr_code_token}</span>
                  </div>
                  <div className="pass-body">
                    <div className="pass-row"><strong>{t('attendeeName')}:</strong> {regSuccessData.attendee_name}</div>
                    <div className="pass-row"><strong>{t('guestsCount')}:</strong> {regSuccessData.guests_count} {lang === 'mr' ? 'व्यक्ती' : 'Person(s)'}</div>
                    <div className="pass-row"><strong>{t('dateLabel')}:</strong> {regSuccessData.date} ({regSuccessData.start_time})</div>
                    <div className="pass-row"><strong>{t('venueLabel')}:</strong> {regSuccessData.venue_mr}</div>
                  </div>
                </div>

                <button className="btn-primary btn-block" onClick={handleCloseRegistration}>
                  {lang === 'mr' ? 'समजले (Done)' : 'Done'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
