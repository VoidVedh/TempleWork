import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Public: Get all albums with photo count and cover
 */
export function getPublicAlbums(req, res) {
  try {
    const { category, year } = req.query;
    let query = `
      SELECT a.*, 
        (SELECT COUNT(*) FROM gallery_photos WHERE album_id = a.id AND is_archived = 0) as photo_count
      FROM albums a
      WHERE a.is_archived = 0
    `;
    const params = [];

    if (category) {
      query += ' AND a.category = ?';
      params.push(category.toUpperCase());
    }
    if (year) {
      query += ' AND a.year = ?';
      params.push(parseInt(year, 10));
    }

    query += ' ORDER BY a.sort_order ASC, a.created_at DESC';
    const albums = db.prepare(query).all(...params);

    res.json({ albums });
  } catch (err) {
    console.error('getPublicAlbums error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve albums.' });
  }
}

/**
 * Public: Get single album and its photos
 */
export function getAlbumPhotos(req, res) {
  try {
    const { identifier } = req.params;
    const album = db.prepare('SELECT * FROM albums WHERE (id = ? OR slug = ?) AND is_archived = 0').get(identifier, identifier);

    if (!album) {
      return res.status(404).json({ error: 'Album not found.' });
    }

    const photos = db.prepare(`
      SELECT * FROM gallery_photos 
      WHERE album_id = ? AND is_archived = 0 
      ORDER BY sort_order ASC, created_at DESC
    `).all(album.id);

    res.json({ album, photos });
  } catch (err) {
    console.error('getAlbumPhotos error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve album photos.' });
  }
}

/**
 * Admin: Create Album
 */
export function adminCreateAlbum(req, res) {
  try {
    const {
      title_en,
      title_mr,
      title_hi,
      description_en,
      description_mr,
      description_hi,
      category = 'FESTIVAL',
      cover_image_url,
      year = 2026,
      sort_order = 0
    } = req.body;

    if (!title_mr) {
      return res.status(400).json({ error: 'अल्बमचे शीर्षक आवश्यक आहे (Album title is required).' });
    }

    const id = 'alb-' + Date.now();
    const slug = (title_en || title_mr).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    db.prepare(`
      INSERT INTO albums (
        id, slug, title_en, title_mr, title_hi, description_en, description_mr, description_hi,
        category, cover_image_url, year, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      slug,
      title_en || title_mr,
      title_mr.trim(),
      title_hi || title_mr,
      description_en || '',
      description_mr || '',
      description_hi || '',
      category,
      cover_image_url || '/assets/ganesha_logo.png',
      parseInt(year, 10) || 2026,
      parseInt(sort_order, 10) || 0
    );

    logAuditEvent({
      eventType: 'GALLERY_ALBUM_CREATED',
      description: `New album created: ${title_mr}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.status(201).json({ success: true, albumId: id, slug });
  } catch (err) {
    console.error('adminCreateAlbum error:', err.message);
    res.status(500).json({ error: 'Failed to create album: ' + err.message });
  }
}

/**
 * Admin: Upload Photo to Album
 */
export function adminUploadPhoto(req, res) {
  try {
    const { album_id, title_en, title_mr, title_hi, caption_en, caption_mr, caption_hi, date_taken } = req.body;

    if (!album_id) {
      return res.status(400).json({ error: 'Album ID is required.' });
    }

    const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(album_id);
    if (!album) {
      return res.status(404).json({ error: 'Album not found.' });
    }

    let imageUrl = req.body.image_url;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'कृपया फोटो फाईल किंवा URL द्या (Photo file or URL is required).' });
    }

    const id = 'pho-' + Date.now();

    db.prepare(`
      INSERT INTO gallery_photos (
        id, album_id, title_en, title_mr, title_hi, image_url, thumbnail_url,
        caption_en, caption_mr, caption_hi, date_taken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      album_id,
      title_en || title_mr || '',
      title_mr || '',
      title_hi || title_mr || '',
      imageUrl,
      imageUrl,
      caption_en || '',
      caption_mr || '',
      caption_hi || '',
      date_taken || new Date().toISOString().slice(0, 10)
    );

    // Update album cover if it has default logo
    db.prepare('UPDATE albums SET cover_image_url = ? WHERE id = ? AND cover_image_url = "/assets/ganesha_logo.png"').run(imageUrl, album_id);

    logAuditEvent({
      eventType: 'GALLERY_PHOTO_ADDED',
      description: `Photo added to album ${album_id}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.status(201).json({ success: true, photoId: id, imageUrl });
  } catch (err) {
    console.error('adminUploadPhoto error:', err.message);
    res.status(500).json({ error: 'Failed to upload photo: ' + err.message });
  }
}

/**
 * Admin: Delete photo
 */
export function adminDeletePhoto(req, res) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM gallery_photos WHERE id = ?').run(id);
    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err) {
    console.error('adminDeletePhoto error:', err.message);
    res.status(500).json({ error: 'Failed to delete photo.' });
  }
}

/**
 * Admin: Delete album
 */
export function adminDeleteAlbum(req, res) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM gallery_photos WHERE album_id = ?').run(id);
    db.prepare('DELETE FROM albums WHERE id = ?').run(id);

    logAuditEvent({
      eventType: 'GALLERY_ALBUM_DELETED',
      description: `Album deleted (ID: ${id})`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.json({ success: true, message: 'Album deleted successfully.' });
  } catch (err) {
    console.error('adminDeleteAlbum error:', err.message);
    res.status(500).json({ error: 'Failed to delete album.' });
  }
}
