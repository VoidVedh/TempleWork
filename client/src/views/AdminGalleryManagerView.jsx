import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FolderPlus, Upload, Trash2, Plus, AlertCircle, X, Sparkles } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AdminGalleryManagerView() {
  const [albums, setAlbums] = useState([]);
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Album Modal
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumTitleMr, setAlbumTitleMr] = useState('');
  const [albumTitleEn, setAlbumTitleEn] = useState('');
  const [albumCategory, setAlbumCategory] = useState('FESTIVAL');
  const [albumYear, setAlbumYear] = useState(2026);
  const [savingAlbum, setSavingAlbum] = useState(false);

  // New Photo Modal
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTitleMr, setPhotoTitleMr] = useState('');
  const [photoCaptionMr, setPhotoCaptionMr] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest('/public/albums');
      const list = res.albums || [];
      setAlbums(list);
      if (list.length > 0) {
        const id = activeAlbumId || list[0].id;
        setActiveAlbumId(id);
        fetchPhotos(id);
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
      setError(err.message || 'Failed to load albums.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async (albumId) => {
    try {
      const res = await apiRequest(`/public/albums/${albumId}`);
      setPhotos(res.photos || []);
    } catch (err) {
      console.error('Fetch photos error:', err);
    }
  };

  const handleSelectAlbum = (id) => {
    setActiveAlbumId(id);
    fetchPhotos(id);
  };

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (!albumTitleMr.trim()) return;

    try {
      setSavingAlbum(true);
      await apiRequest('/admin/albums', {
        method: 'POST',
        body: JSON.stringify({
          title_mr: albumTitleMr.trim(),
          title_en: albumTitleEn.trim() || albumTitleMr.trim(),
          category: albumCategory,
          year: parseInt(albumYear, 10)
        })
      });
      setIsAlbumModalOpen(false);
      setAlbumTitleMr('');
      setAlbumTitleEn('');
      fetchAlbums();
    } catch (err) {
      console.error('Create album error:', err);
      alert(err.message || 'Failed to create album.');
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!activeAlbumId) return;

    try {
      setUploadingPhoto(true);

      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('album_id', activeAlbumId);
        formData.append('title_mr', photoTitleMr);
        formData.append('caption_mr', photoCaptionMr);

        const token = localStorage.getItem('ekdant_token');
        const res = await fetch('/api/admin/photos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Upload failed');
        }
      } else if (photoUrl.trim()) {
        await apiRequest('/admin/photos', {
          method: 'POST',
          body: JSON.stringify({
            album_id: activeAlbumId,
            image_url: photoUrl.trim(),
            title_mr: photoTitleMr,
            caption_mr: photoCaptionMr
          })
        });
      } else {
        alert('कृपया फोटो फाईल निवडा किंवा URL टाका.');
        return;
      }

      setIsPhotoModalOpen(false);
      setPhotoTitleMr('');
      setPhotoCaptionMr('');
      setPhotoFile(null);
      setPhotoUrl('');
      fetchPhotos(activeAlbumId);
      fetchAlbums();
    } catch (err) {
      console.error('Upload photo error:', err);
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('हा फोटो हटवायचा आहे का?')) return;
    try {
      await apiRequest(`/admin/photos/${photoId}`, { method: 'DELETE' });
      fetchPhotos(activeAlbumId);
      fetchAlbums();
    } catch (err) {
      console.error('Delete photo error:', err);
      alert(err.message || 'Failed to delete photo.');
    }
  };

  const handleDeleteAlbum = async (albumId, title) => {
    if (!window.confirm(`खरोखर "${title}" हा अल्बम आणि त्यातील सर्व फोटो हटवायचे आहेत का?`)) return;
    try {
      await apiRequest(`/admin/albums/${albumId}`, { method: 'DELETE' });
      setActiveAlbumId(null);
      fetchAlbums();
    } catch (err) {
      console.error('Delete album error:', err);
      alert(err.message || 'Failed to delete album.');
    }
  };

  return (
    <div className="section-container animate-fade-in">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🖼️ छायाचित्र दालन व्यवस्थापन (Gallery & Albums)</h1>
          <p className="admin-page-sub">अल्बम तयार करा आणि उत्सव, महाप्रसाद व सांस्कृतिक कार्यक्रमांचे फोटो अपलोड करा.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setIsAlbumModalOpen(true)}>
            <FolderPlus size={16} />
            <span>+ नवीन अल्बम तयार करा</span>
          </button>
          <button 
            className="btn-primary" 
            disabled={!activeAlbumId}
            onClick={() => setIsPhotoModalOpen(true)}
          >
            <Upload size={16} />
            <span>+ फोटो अपलोड करा</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert-box mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Album Tabs */}
      <div className="album-pill-scroll-bar">
        {albums.map(alb => (
          <div key={alb.id} className="inline-flex items-center gap-1">
            <button
              className={`album-pill-btn ${activeAlbumId === alb.id ? 'active' : ''}`}
              onClick={() => handleSelectAlbum(alb.id)}
            >
              <span>{alb.title_mr}</span>
              <span className="album-count-badge">{alb.photo_count || 0}</span>
            </button>
            <button 
              className="btn-action-icon text-red-600"
              title="अल्बम हटवा"
              onClick={() => handleDeleteAlbum(alb.id, alb.title_mr)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Photos Grid */}
      <div className="admin-gallery-grid mt-4">
        {photos.length === 0 ? (
          <div className="empty-state-card" style={{ gridColumn: '1 / -1' }}>
            <ImageIcon size={48} className="empty-state-icon" />
            <h3>या अल्बममध्ये अजून फोटो नाहीत. वरील "+ फोटो अपलोड करा" वर क्लिक करा.</h3>
          </div>
        ) : (
          photos.map(p => (
            <div key={p.id} className="admin-photo-card">
              <img src={p.image_url} alt={p.title_mr || 'Photo'} className="admin-photo-thumb" />
              <div className="admin-photo-info">
                <div className="text-sm font-bold truncate">{p.title_mr || 'फोटो'}</div>
                <div className="text-xs text-muted truncate">{p.caption_mr || ''}</div>
              </div>
              <button 
                className="admin-photo-delete-btn"
                title="हटवा"
                onClick={() => handleDeletePhoto(p.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Album Modal */}
      {isAlbumModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsAlbumModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Sparkles size={18} className="gold-icon" />
                <span>+ नवीन अल्बम तयार करा</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAlbumModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="modal-body admin-form-grid">
              <div className="form-group">
                <label className="form-label">अल्बम नाव (मराठी) *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="उदा. गणेशोत्सव २०२६ दर्शन"
                  value={albumTitleMr}
                  onChange={e => setAlbumTitleMr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Album Title (English)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ganeshotsav 2026 Darshan"
                  value={albumTitleEn}
                  onChange={e => setAlbumTitleEn(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">श्रेणी (Category)</label>
                  <select 
                    className="form-control"
                    value={albumCategory}
                    onChange={e => setAlbumCategory(e.target.value)}
                  >
                    <option value="FESTIVAL">FESTIVAL (उत्सव)</option>
                    <option value="CULTURAL">CULTURAL (सांस्कृतिक)</option>
                    <option value="PUJA">PUJA (धार्मिक विधी)</option>
                    <option value="SOCIAL">SOCIAL (सामाजिक कार्य)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">वर्ष (Year)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={albumYear}
                    onChange={e => setAlbumYear(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={() => setIsAlbumModalOpen(false)}>
                  रद्द करा
                </button>
                <button type="submit" className="btn-primary" disabled={savingAlbum}>
                  {savingAlbum ? 'तयार करत आहे...' : 'अल्बम तयार करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isPhotoModalOpen && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setIsPhotoModalOpen(false)}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Upload size={18} className="gold-icon" />
                <span>+ फोटो अपलोड करा</span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsPhotoModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadPhoto} className="modal-body admin-form-grid">
              <div className="form-group">
                <label className="form-label">फोटो फाईल निवडा (JPG, PNG, WEBP)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="form-control"
                  onChange={e => setPhotoFile(e.target.files[0])}
                />
              </div>

              <div className="form-group">
                <label className="form-label">किंवा इमेज URL टाका</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="/assets/ganesha_logo.png किंवा https://..."
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">फोटो शीर्षक (Title)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="उदा. महाआरती सोहळा"
                  value={photoTitleMr}
                  onChange={e => setPhotoTitleMr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">तपशील किंवा कॅप्शन (Caption)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="उदा. आरतीच्या वेळी उपस्थित हजारो भाविक."
                  value={photoCaptionMr}
                  onChange={e => setPhotoCaptionMr(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={() => setIsPhotoModalOpen(false)}>
                  रद्द करा
                </button>
                <button type="submit" className="btn-primary" disabled={uploadingPhoto}>
                  {uploadingPhoto ? 'अपलोड होत आहे...' : 'अपलोड करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
