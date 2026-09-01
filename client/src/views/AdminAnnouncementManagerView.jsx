import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Edit3, Calendar, AlertCircle, X, Sparkles } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AdminAnnouncementManagerView() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title_mr: '',
    title_en: '',
    title_hi: '',
    content_mr: '',
    content_en: '',
    content_hi: '',
    priority: 'NORMAL',
    status: 'NEW'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/admin/announcements');
      setAnnouncements(res.announcements || []);
    } catch (err) {
      console.error('Fetch announcements error:', err);
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title_mr: '',
      title_en: '',
      title_hi: '',
      content_mr: '',
      content_en: '',
      content_hi: '',
      priority: 'NORMAL',
      status: 'NEW'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a) => {
    setEditingId(a.id);
    setFormData({
      title_mr: a.title_mr || '',
      title_en: a.title_en || '',
      title_hi: a.title_hi || '',
      content_mr: a.content_mr || '',
      content_en: a.content_en || '',
      content_hi: a.content_hi || '',
      priority: a.priority || 'NORMAL',
      status: a.status || 'NEW'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title_mr || !formData.content_mr) {
      alert('कृपया शीर्षक आणि तपशील भरा.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await apiRequest(`/admin/announcements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiRequest('/admin/announcements', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Save announcement error:', err);
      alert(err.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`खरोखर "${title}" ही सूचना हटवायची आहे का?`)) return;
    try {
      await apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' });
      fetchAnnouncements();
    } catch (err) {
      console.error('Delete announcement error:', err);
      alert(err.message || 'Failed to delete announcement.');
    }
  };

  return (
    <div className="section-container animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">📢 सूचना फलक व्यवस्थापन (Notice Board)</h1>
          <p className="admin-page-sub">मंदिर ट्रस्ट व उत्सव समितीचे परिपत्रक, महत्त्वाच्या घोषणा आणि सूचना प्रकाशित करा.</p>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>+ नवीन सूचना प्रकाशित करा</span>
        </button>
      </div>

      {error && (
        <div className="error-alert-box mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="admin-table-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>शीर्षक (Title)</th>
              <th>प्राधान्य (Priority)</th>
              <th>तारीख (Published Date)</th>
              <th>प्रशासक (Author)</th>
              <th style={{ textAlign: 'right' }}>कृती (Actions)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>लोड होत आहे...</td></tr>
            ) : announcements.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>कोणतीही सूचना उपलब्ध नाही.</td></tr>
            ) : (
              announcements.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title_mr}</strong>
                    <div className="text-xs text-muted">{a.content_mr ? a.content_mr.slice(0, 80) + '...' : ''}</div>
                  </td>
                  <td>
                    <span className={`announcement-priority-pill badge-${a.priority.toLowerCase()}`}>
                      {a.priority}
                    </span>
                  </td>
                  <td>📅 {a.published_at ? a.published_at.slice(0, 10) : ''}</td>
                  <td>{a.author_name || 'मंडळ प्रशासन'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button className="btn-action-icon" onClick={() => handleOpenEdit(a)}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn-action-icon text-red-600" onClick={() => handleDelete(a.id, a.title_mr)}>
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

      {isModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Sparkles size={18} className="gold-icon" />
                <span>{editingId ? 'सूचना संपादित करा' : '+ नवीन सूचना जोडा'}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-body admin-form-grid">
              <div className="form-group">
                <label className="form-label">मराठी शीर्षक *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="उदा. गणेशोत्सव नियोजन बैठक"
                  value={formData.title_mr}
                  onChange={e => setFormData({ ...formData, title_mr: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">English Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Festival Planning Meeting"
                  value={formData.title_en}
                  onChange={e => setFormData({ ...formData, title_en: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">प्राधान्य (Priority)</label>
                  <select
                    className="form-control"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="NORMAL">NORMAL (सामान्य)</option>
                    <option value="IMPORTANT">IMPORTANT (महत्त्वाचे)</option>
                    <option value="URGENT">URGENT (तातडीचे / अत्यावश्यक)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">स्थिती (Status Tag)</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="NEW">NEW (नवीन)</option>
                    <option value="IMPORTANT">IMPORTANT</option>
                    <option value="UPDATED">UPDATED (सुधारित)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">तपशील व मजकूर (Content in Marathi) *</label>
                <textarea
                  rows={4}
                  required
                  className="form-control"
                  placeholder="सूचनेचा संपूर्ण मजकूर येथे लिहा..."
                  value={formData.content_mr}
                  onChange={e => setFormData({ ...formData, content_mr: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  रद्द करा
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'जतन करत आहे...' : 'प्रकाशित करा (Publish)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
