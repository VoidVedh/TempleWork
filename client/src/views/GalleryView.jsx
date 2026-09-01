import React, { useState, useEffect, useCallback } from 'react';
import { 
  Image as ImageIcon, Folder, Calendar, Maximize2, 
  ChevronLeft, ChevronRight, X, AlertCircle, Sparkles, Filter 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../utils/api';

export default function GalleryView() {
  const { lang, t } = useLanguage();

  const [albums, setAlbums] = useState([]);
  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState('');

  // Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiRequest('/public/albums');
      const list = data.albums || [];
      setAlbums(list);
      if (list.length > 0) {
        setActiveAlbumId(list[0].id);
        fetchAlbumPhotos(list[0].id);
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
      setError(err.message || 'Failed to load albums.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbumPhotos = async (albumId) => {
    try {
      setPhotosLoading(true);
      const data = await apiRequest(`/public/albums/${albumId}`);
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Fetch album photos error:', err);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleSelectAlbum = (albumId) => {
    setActiveAlbumId(albumId);
    fetchAlbumPhotos(albumId);
  };

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback((e) => {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') setLightboxIndex(null);
    if (e.key === 'ArrowRight') setLightboxIndex((lightboxIndex + 1) % photos.length);
    if (e.key === 'ArrowLeft') setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
  }, [lightboxIndex, photos]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const activeAlbum = albums.find(a => a.id === activeAlbumId);
  const currentLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="section-container animate-fade-in">
      {/* Header Banner */}
      <div className="section-header-banner">
        <div className="section-header-text">
          <div className="section-pretitle">॥ मंगलमूर्ती मोरया ॥</div>
          <h1 className="section-title">{t('galleryTitle')}</h1>
          <p className="section-subtitle">{t('gallerySubtitle')}</p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="skeleton-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-box skeleton-album-card" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="error-alert-box">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchAlbums}>पुन्हा प्रयत्न करा (Retry)</button>
        </div>
      )}

      {/* Album Selector Tabs */}
      {!loading && !error && albums.length > 0 && (
        <>
          <div className="album-pill-scroll-bar">
            {albums.map(album => (
              <button
                key={album.id}
                className={`album-pill-btn ${activeAlbumId === album.id ? 'active' : ''}`}
                onClick={() => handleSelectAlbum(album.id)}
              >
                <Folder size={16} className="album-pill-icon" />
                <span>
                  {lang === 'en' ? (album.title_en || album.title_mr) : lang === 'hi' ? (album.title_hi || album.title_mr) : album.title_mr}
                </span>
                <span className="album-count-badge">{album.photo_count || photos.length}</span>
              </button>
            ))}
          </div>

          {/* Active Album Description */}
          {activeAlbum && (
            <div className="active-album-banner">
              <h2 className="active-album-heading">
                {lang === 'en' ? (activeAlbum.title_en || activeAlbum.title_mr) : lang === 'hi' ? (activeAlbum.title_hi || activeAlbum.title_mr) : activeAlbum.title_mr}
              </h2>
              {activeAlbum.description_mr && (
                <p className="active-album-sub">
                  {lang === 'en' ? (activeAlbum.description_en || activeAlbum.description_mr) : lang === 'hi' ? (activeAlbum.description_hi || activeAlbum.description_mr) : activeAlbum.description_mr}
                </p>
              )}
            </div>
          )}

          {/* Photos Grid */}
          {photosLoading ? (
            <div className="skeleton-photo-grid">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-box skeleton-photo-item" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="empty-state-card">
              <ImageIcon size={48} className="empty-state-icon" />
              <h3 className="empty-state-title">
                {lang === 'mr' ? 'या अल्बममध्ये अद्याप छायाचित्रे नाहीत' : 'No photos in this album yet'}
              </h3>
            </div>
          ) : (
            <div className="gallery-masonry-grid">
              {photos.map((photo, idx) => (
                <div 
                  key={photo.id} 
                  className="gallery-photo-card"
                  onClick={() => setLightboxIndex(idx)}
                >
                  <div className="photo-image-container">
                    <img
                      src={photo.image_url}
                      alt={photo.title_mr || 'Mandir Darshan'}
                      loading="lazy"
                      className="photo-img"
                    />
                    <div className="photo-overlay-shade">
                      <Maximize2 size={24} className="maximize-icon" />
                    </div>
                  </div>

                  {(photo.title_mr || photo.caption_mr) && (
                    <div className="photo-caption-bar">
                      <div className="photo-caption-title">
                        {lang === 'en' ? (photo.title_en || photo.title_mr) : lang === 'hi' ? (photo.title_hi || photo.title_mr) : photo.title_mr}
                      </div>
                      {photo.date_taken && (
                        <div className="photo-caption-date">📅 {photo.date_taken}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Fullscreen Lightbox Modal */}
      {currentLightboxPhoto && (
        <div className="lightbox-backdrop animate-fade-in" onClick={() => setLightboxIndex(null)}>
          <button 
            className="lightbox-close-btn" 
            title={t('closeViewer')}
            onClick={() => setLightboxIndex(null)}
          >
            <X size={24} />
          </button>

          {photos.length > 1 && (
            <>
              <button 
                className="lightbox-nav-btn prev"
                title={t('prevPhoto')}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
                }}
              >
                <ChevronLeft size={32} />
              </button>

              <button 
                className="lightbox-nav-btn next"
                title={t('nextPhoto')}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % photos.length);
                }}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div className="lightbox-content-box" onClick={e => e.stopPropagation()}>
            <img 
              src={currentLightboxPhoto.image_url} 
              alt={currentLightboxPhoto.title_mr || 'Mandir Darshan'}
              className="lightbox-main-img"
            />

            <div className="lightbox-caption-strip">
              <div className="lightbox-caption-text">
                <span className="caption-bold">
                  {lang === 'en' ? (currentLightboxPhoto.title_en || currentLightboxPhoto.title_mr) : lang === 'hi' ? (currentLightboxPhoto.title_hi || currentLightboxPhoto.title_mr) : currentLightboxPhoto.title_mr}
                </span>
                {currentLightboxPhoto.caption_mr && (
                  <span className="caption-sub"> — {lang === 'en' ? (currentLightboxPhoto.caption_en || currentLightboxPhoto.caption_mr) : currentLightboxPhoto.caption_mr}</span>
                )}
              </div>
              <div className="lightbox-counter-badge">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
