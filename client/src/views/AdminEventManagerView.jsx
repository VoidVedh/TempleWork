import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Trash2, Edit3, Users, Clock, MapPin, 
  CheckCircle, X, AlertCircle, Sparkles, Download, Eye 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../utils/api';

export default function AdminEventManagerView() {
  const { lang, t } = useLanguage();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_mr: '',
    title_hi: '',
    description_mr: '',
    description_en: '',
    date: '',
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    venue_mr: 'श्री सिद्धिविनायक मंदिर मुख्य मंडप',
    venue_en: 'Shree Siddhivinayak Mandir Mandap',
    status: 'UPCOMING',
    capacity: 500,
    registration_enabled: 1
  });
  const [saving, setSaving] = useState(false);

  // Registrations Roster Modal
  const [rosterEvent, setRosterEvent] = useState(null);
  const [rosterRegistrations, setRosterRegistrations] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    fetchAdminEvents();
  }, []);

  const fetchAdminEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/admin/events');
      setEvents(res.events || []);
    } catch (err) {
      console.error('Fetch admin events error:', err);
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormData({
      title_en: '',
      title_mr: '',
      title_hi: '',
      description_mr: '',
      description_en: '',
      date: new Date().toISOString().slice(0, 10),
      start_time: '08:00 AM',
      end_time: '12:00 PM',
      venue_mr: 'श्री सिद्धिविनायक मंदिर मुख्य मंडप',
      venue_en: 'Shree Siddhivinayak Mandir Mandap',
      status: 'UPCOMING',
      capacity: 500,
      registration_enabled: 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setEditingEventId(evt.id);
    setFormData({
      title_en: evt.title_en || '',
      title_mr: evt.title_mr || '',
      title_hi: evt.title_hi || '',
      description_mr: evt.description_mr || '',
      description_en: evt.description_en || '',
      date: evt.date || '',
      start_time: evt.start_time || '',
      end_time: evt.end_time || '',
      venue_mr: evt.venue_mr || '',
      venue_en: evt.venue_en || '',
      status: evt.status || 'UPCOMING',
      capacity: evt.capacity || 0,
      registration_enabled: evt.registration_enabled ? 1 : 0
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!formData.title_mr || !formData.date || !formData.start_time) {
      alert('कृपया शीर्षक, तारीख आणि वेळ भरा.');
      return;
    }

    try {
      setSaving(true);
      if (editingEventId) {
        await apiRequest(`/admin/events/${editingEventId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/admin/events', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchAdminEvents();
    } catch (err) {
      console.error('Save event error:', err);
      alert(err.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (!window.confirm(`खरोखर "${title}" हा कार्यक्रम हटवायचा आहे का?`)) return;
    try {
      await apiRequest(`/admin/events/${id}`, { method: 'DELETE' });
      fetchAdminEvents();
    } catch (err) {
      console.error('Delete event error:', err);
      alert(err.message || 'Failed to delete event.');
    }
  };

  const handleViewRoster = async (event) => {
    setRosterEvent(event);
    try {
      setRosterLoading(true);
      const res = await apiRequest(`/admin/events/${event.id}/registrations`);
      setRosterRegistrations(res.registrations || []);
    } catch (err) {
      console.error('Fetch roster error:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  return (
    <div className="section-container animate-fade-in">
      {/* Header Row */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🎪 कार्यक्रम व्यवस्थापन (Event Management)</h1>
          <p className="admin-page-sub">मंदिरातील उत्सव, धार्मिक कार्यक्रम, क्षमता आणि उपस्थिती यादी व्यवस्थापित करा.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>+ नवीन कार्यक्रम जोडा</span>
        </button>
      </div>

      {error && (
        <div className="error-alert-box mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Events Table */}
      <div className="admin-table-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>कार्यक्रम नाव (Event Title)</th>
              <th>तारीख व वेळ (Date & Time)</th>
              <th>ठिकाण (Venue)</th>
              <th>नोंदणी (Registrations / Capacity)</th>
              <th>स्थिती (Status)</th>
              <th style={{ textAlign: 'right' }}>कृती (Actions)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>लोड होत आहे...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>कोणताही कार्यक्रम उपलब्ध नाही.</td></tr>
            ) : (
              events.map(evt => (
                <tr key={evt.id}>
                  <td>
                    <strong className="text-maroon">{evt.title_mr}</strong>
                    <div className="text-xs text-muted">{evt.title_en}</div>
                  </td>
                  <td>
                    <div>📅 {evt.date}</div>
                    <div className="text-xs text-muted">⏰ {evt.start_time} {evt.end_time ? `- ${evt.end_time}` : ''}</div>
                  </td>
                  <td>{evt.venue_mr}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{evt.active_registrations_count || evt.registered_count || 0}</span>
                      <span className="text-muted">/ {evt.capacity > 0 ? evt.capacity : '∞'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`event-status-pill status-${evt.status.toLowerCase()}`}>
                      {evt.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button 
                        className="btn-action-icon"
                        title="उपस्थिती यादी पहा"
                        onClick={() => handleViewRoster(evt)}
                      >
                        <Eye size={16} />
                      </button>

                      <button 
                        className="btn-action-icon"
                        title="संपादित करा"
                        onClick={() => handleOpenEdit(evt)}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button 
                        className="btn-action-icon text-red-600"
                        title="हटवा"
                        onClick={() => handleDeleteEvent(evt.id, evt.title_mr)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="modal-window admin-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Sparkles size={18} className="gold-icon" />
                <span>{editingEventId ? 'कार्यक्रम संपादित करा' : '+ नवीन कार्यक्रम जोडा'}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="modal-body admin-form-grid">
              <div className="form-group">
                <label className="form-label">मराठी शीर्षक (Marathi Title) *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="उदा. श्री गणेश मूर्ती प्राणप्रतिष्ठा"
                  value={formData.title_mr}
                  onChange={e => setFormData({ ...formData, title_mr: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">English Title *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Shree Ganesh Murti Sthapana"
                  value={formData.title_en}
                  onChange={e => setFormData({ ...formData, title_en: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">तारीख (Date) *</label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">सुरू होण्याची वेळ (Start Time) *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="08:00 AM"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">समाप्ती वेळ (End Time)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="12:30 PM"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ठिकाण (Venue in Marathi) *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.venue_mr}
                  onChange={e => setFormData({ ...formData, venue_mr: e.target.value })}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">स्थिती (Status)</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="UPCOMING">UPCOMING (आगामी)</option>
                    <option value="LIVE">LIVE (सध्या चालू)</option>
                    <option value="COMPLETED">COMPLETED (संपन्न)</option>
                    <option value="RESCHEDULED">RESCHEDULED (बदललेली वेळ)</option>
                    <option value="CANCELLED">CANCELLED (रद्द)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">एकूण क्षमता (Capacity, 0 = Unlimited)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">नोंदणी सुरू ठेवा?</label>
                  <select
                    className="form-control"
                    value={formData.registration_enabled}
                    onChange={e => setFormData({ ...formData, registration_enabled: parseInt(e.target.value, 10) })}
                  >
                    <option value={1}>होय (Open)</option>
                    <option value={0}>नाही (Closed)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">कार्यक्रम माहिती व तपशील (Description)</label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder="कार्यक्रमाची रूपरेषा व धार्मिक महत्त्व येथे लिहा..."
                  value={formData.description_mr}
                  onChange={e => setFormData({ ...formData, description_mr: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  रद्द करा
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'जतन करत आहे...' : 'जतन करा (Save Event)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registrations Roster Modal */}
      {rosterEvent && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setRosterEvent(null)}>
          <div className="modal-window admin-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Users size={18} className="gold-icon" />
                <span>उपस्थिती यादी — {rosterEvent.title_mr}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setRosterEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {rosterLoading ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>नोंदणी यादी लोड होत आहे...</div>
              ) : rosterRegistrations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>या कार्यक्रमासाठी अद्याप कोणतीही नोंदणी झालेली नाही.</div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>पास आयडी (Pass Token)</th>
                      <th>नाव (Attendee Name)</th>
                      <th>मोबाईल (Mobile)</th>
                      <th>व्यक्ती संख्या (Guests)</th>
                      <th>नोंदणी तारीख (Registered At)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRegistrations.map(reg => (
                      <tr key={reg.id}>
                        <td className="font-mono font-bold text-maroon">{reg.qr_code_token}</td>
                        <td><strong>{reg.attendee_name}</strong></td>
                        <td>{reg.attendee_mobile}</td>
                        <td>{reg.guests_count}</td>
                        <td>{reg.created_at ? reg.created_at.slice(0, 10) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
