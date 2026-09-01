import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Public: Get active announcements (auto-handles expiry date)
 */
export function getPublicAnnouncements(req, res) {
  try {
    const { priority, limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const now = new Date().toISOString();

    let query = `
      SELECT * FROM announcements 
      WHERE (expires_at IS NULL OR expires_at > ?) AND status != 'EXPIRED'
    `;
    const params = [now];

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority.toUpperCase());
    }

    query += " ORDER BY CASE priority WHEN 'URGENT' THEN 1 WHEN 'IMPORTANT' THEN 2 ELSE 3 END, published_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), offset);

    const announcements = db.prepare(query).all(...params);

    res.json({
      announcements,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (err) {
    console.error('getPublicAnnouncements error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
}

/**
 * Admin: List all announcements
 */
export function adminListAnnouncements(req, res) {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY published_at DESC').all();
    res.json({ announcements });
  } catch (err) {
    console.error('adminListAnnouncements error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve announcements for management.' });
  }
}

/**
 * Admin: Create announcement
 */
export function adminCreateAnnouncement(req, res) {
  try {
    const {
      title_en,
      title_mr,
      title_hi,
      content_en,
      content_mr,
      content_hi,
      priority = 'NORMAL',
      status = 'NEW',
      expires_at,
      related_event_id
    } = req.body;

    if (!title_mr || !content_mr) {
      return res.status(400).json({ error: 'मराठी शीर्षक आणि तपशील आवश्यक आहेत (Marathi title and content required).' });
    }

    const id = 'ann-' + Date.now();

    db.prepare(`
      INSERT INTO announcements (
        id, title_en, title_mr, title_hi, content_en, content_mr, content_hi,
        priority, status, published_at, expires_at, author_id, author_name, related_event_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title_en || title_mr,
      title_mr.trim(),
      title_hi || title_mr,
      content_en || content_mr,
      content_mr.trim(),
      content_hi || content_mr,
      priority,
      status,
      new Date().toISOString(),
      expires_at || null,
      req.user ? req.user.id : null,
      req.user ? req.user.name_mr || req.user.name : 'मंडळ प्रशासन',
      related_event_id || null
    );

    // Broadcast system notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title_en, title_mr, title_hi, message_en, message_mr, message_hi, link)
      VALUES (?, NULL, 'ANNOUNCEMENT', ?, ?, ?, ?, ?, ?, '/announcements')
    `).run(
      'notif-broadcast-' + Date.now(),
      title_en || title_mr,
      title_mr,
      title_hi || title_mr,
      content_en ? content_en.slice(0, 100) + '...' : content_mr.slice(0, 100),
      content_mr.slice(0, 100) + '...',
      content_hi ? content_hi.slice(0, 100) + '...' : content_mr.slice(0, 100)
    );

    logAuditEvent({
      eventType: 'ANNOUNCEMENT_PUBLISHED',
      description: `Announcement created: ${title_mr}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.status(201).json({ success: true, announcementId: id });
  } catch (err) {
    console.error('adminCreateAnnouncement error:', err.message);
    res.status(500).json({ error: 'Failed to create announcement: ' + err.message });
  }
}

/**
 * Admin: Update announcement
 */
export function adminUpdateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);

    if (!ann) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    const {
      title_en,
      title_mr,
      title_hi,
      content_en,
      content_mr,
      content_hi,
      priority,
      status,
      expires_at,
      related_event_id
    } = req.body;

    db.prepare(`
      UPDATE announcements SET
        title_en = COALESCE(?, title_en),
        title_mr = COALESCE(?, title_mr),
        title_hi = COALESCE(?, title_hi),
        content_en = COALESCE(?, content_en),
        content_mr = COALESCE(?, content_mr),
        content_hi = COALESCE(?, content_hi),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        expires_at = COALESCE(?, expires_at),
        related_event_id = COALESCE(?, related_event_id)
      WHERE id = ?
    `).run(
      title_en,
      title_mr,
      title_hi,
      content_en,
      content_mr,
      content_hi,
      priority,
      status,
      expires_at,
      related_event_id,
      id
    );

    logAuditEvent({
      eventType: 'ANNOUNCEMENT_UPDATED',
      description: `Announcement updated: ${ann.title_mr}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.json({ success: true, message: 'Announcement updated.' });
  } catch (err) {
    console.error('adminUpdateAnnouncement error:', err.message);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
}

/**
 * Admin: Delete announcement
 */
export function adminDeleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);

    logAuditEvent({
      eventType: 'ANNOUNCEMENT_DELETED',
      description: `Announcement deleted (ID: ${id})`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    console.error('adminDeleteAnnouncement error:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
}
