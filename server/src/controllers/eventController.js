import crypto from 'crypto';
import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Public: List events with optional filters (status, search, month/year)
 */
export function getPublicEvents(req, res) {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = 'SELECT * FROM events WHERE status != ?';
    const params = ['DRAFT'];

    if (status && ['UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'].includes(status.toUpperCase())) {
      query += ' AND status = ?';
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      query += ' AND (title_en LIKE ? OR title_mr LIKE ? OR title_hi LIKE ? OR venue_mr LIKE ? OR venue_en LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    query += " ORDER BY CASE status WHEN 'LIVE' THEN 1 WHEN 'UPCOMING' THEN 2 WHEN 'RESCHEDULED' THEN 3 WHEN 'COMPLETED' THEN 4 ELSE 5 END, date ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), offset);

    const events = db.prepare(query).all(...params);
    const total = db.prepare("SELECT COUNT(*) as count FROM events WHERE status != 'DRAFT'").get();

    res.json({
      events,
      total: total.count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
  } catch (err) {
    console.error('getPublicEvents error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve events.' });
  }
}

/**
 * Public: Get single event by ID or slug
 */
export function getEventBySlugOrId(req, res) {
  try {
    const { identifier } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ? OR slug = ?').get(identifier, identifier);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ event });
  } catch (err) {
    console.error('getEventBySlugOrId error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve event.' });
  }
}

/**
 * Devotee / User: Register for an event (Transaction-safe capacity check)
 */
export function registerForEvent(req, res) {
  try {
    const { event_id, attendee_name, attendee_mobile, attendee_email, guests_count = 1 } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required.' });
    }
    if (!attendee_name || attendee_name.trim().length < 2) {
      return res.status(400).json({ error: 'कृपया नाव प्रविष्ट करा (Valid attendee name is required).' });
    }
    const cleanMobile = String(attendee_mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ error: 'कृपया १० अंकी मोबाईल नंबर टाका (Valid 10-digit mobile required).' });
    }
    const count = Math.max(1, parseInt(guests_count, 10) || 1);

    // Database transaction for capacity & uniqueness enforcement
    const registerTx = db.transaction(() => {
      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
      if (!event) {
        throw new Error('उत्सव/कार्यक्रम आढळला नाही (Event not found).');
      }

      if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
        throw new Error(`हा कार्यक्रम ${event.status === 'CANCELLED' ? 'रद्द' : 'पूर्ण'} झाला आहे. नोंदणी बंद आहे.`);
      }

      if (!event.registration_enabled) {
        throw new Error('या कार्यक्रमासाठी नोंदणी बंद आहे (Registration is closed for this event).');
      }

      // Check existing active registration for mobile
      const existing = db.prepare("SELECT id FROM event_registrations WHERE event_id = ? AND attendee_mobile = ? AND status = 'CONFIRMED'").get(event_id, cleanMobile);
      if (existing) {
        throw new Error('आपण या कार्यक्रमासाठी आधीच नोंदणी केली आहे (You have already registered for this event).');
      }

      // Capacity verification
      if (event.capacity > 0 && (event.registered_count + count) > event.capacity) {
        throw new Error(`क्षमतेपेक्षा जास्त नोंदणी शक्य नाही. फक्त ${Math.max(0, event.capacity - event.registered_count)} जागा शिल्लक आहेत.`);
      }

      const regId = 'reg-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
      const qrToken = 'EVT-' + crypto.randomBytes(6).toString('hex').toUpperCase();

      db.prepare(`
        INSERT INTO event_registrations (id, event_id, user_id, attendee_name, attendee_mobile, attendee_email, guests_count, status, qr_code_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)
      `).run(regId, event_id, userId, attendee_name.trim(), cleanMobile, attendee_email ? attendee_email.trim() : null, count, qrToken, new Date().toISOString());

      db.prepare('UPDATE events SET registered_count = registered_count + ?, updated_at = ? WHERE id = ?').run(count, new Date().toISOString(), event_id);

      // Create confirmation notification if user is logged in
      if (userId) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title_en, title_mr, title_hi, message_en, message_mr, message_hi, link)
          VALUES (?, ?, 'REGISTRATION_CONFIRMATION', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'notif-' + Date.now(),
          userId,
          'Event Registration Confirmed',
          'कार्यक्रम नोंदणी यशस्वी',
          'कार्यक्रम पंजीकरण सफल',
          `Your registration for ${event.title_en} is confirmed. Pass ID: ${qrToken}`,
          `${event.title_mr} साठी आपली नोंदणी यशस्वी झाली आहे. पास: ${qrToken}`,
          `${event.title_hi} के लिए आपका पंजीकरण सफल हुआ है। पास: ${qrToken}`,
          `/events/${event.slug || event.id}`
        );
      }

      return {
        id: regId,
        event_id,
        event_title_mr: event.title_mr,
        event_title_en: event.title_en,
        attendee_name: attendee_name.trim(),
        attendee_mobile: cleanMobile,
        guests_count: count,
        qr_code_token: qrToken,
        venue_mr: event.venue_mr,
        date: event.date,
        start_time: event.start_time
      };
    });

    const result = registerTx();
    res.status(201).json({
      success: true,
      message: 'नोंदणी यशस्वी झाली! (Registration successful)',
      registration: result
    });
  } catch (err) {
    console.error('registerForEvent error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

/**
 * Devotee: Get my registrations by logged-in user or mobile query
 */
export function getMyRegistrations(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const { mobile } = req.query;

    if (!userId && !mobile) {
      return res.status(400).json({ error: 'Mobile number or login is required.' });
    }

    let registrations = [];
    if (userId) {
      registrations = db.prepare(`
        SELECT r.*, e.title_en, e.title_mr, e.title_hi, e.date, e.start_time, e.end_time, e.venue_mr, e.venue_en, e.slug, e.status as event_status
        FROM event_registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = ? OR r.attendee_mobile = ?
        ORDER BY r.created_at DESC
      `).all(userId, req.user.mobile);
    } else {
      const cleanMobile = String(mobile).replace(/\D/g, '');
      registrations = db.prepare(`
        SELECT r.*, e.title_en, e.title_mr, e.title_hi, e.date, e.start_time, e.end_time, e.venue_mr, e.venue_en, e.slug, e.status as event_status
        FROM event_registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.attendee_mobile = ?
        ORDER BY r.created_at DESC
      `).all(cleanMobile);
    }

    res.json({ registrations });
  } catch (err) {
    console.error('getMyRegistrations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve registrations.' });
  }
}

/**
 * Admin: List all events with registration count details
 */
export function adminListEvents(req, res) {
  try {
    const events = db.prepare(`
      SELECT e.*, 
        (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id AND status = 'CONFIRMED') as active_registrations_count
      FROM events e 
      ORDER BY date DESC
    `).all();
    res.json({ events });
  } catch (err) {
    console.error('adminListEvents error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve events for management.' });
  }
}

/**
 * Admin: Create event
 */
export function adminCreateEvent(req, res) {
  try {
    const {
      title_en,
      title_mr,
      title_hi,
      description_en,
      description_mr,
      description_hi,
      date,
      start_time,
      end_time,
      venue_en,
      venue_mr,
      venue_hi,
      address,
      map_url,
      organizer,
      status = 'UPCOMING',
      capacity = 0,
      registration_enabled = 1,
      banner_image_url
    } = req.body;

    if (!title_mr || !title_en || !date || !start_time || !venue_mr) {
      return res.status(400).json({ error: 'शीर्षक, तारीख, वेळ आणि ठिकाण आवश्यक आहेत (Title, date, time and venue are required).' });
    }

    const id = 'evt-' + Date.now();
    const slug = title_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    db.prepare(`
      INSERT INTO events (
        id, slug, title_en, title_mr, title_hi, description_en, description_mr, description_hi,
        date, start_time, end_time, venue_en, venue_mr, venue_hi, address, map_url, organizer,
        status, capacity, registered_count, registration_enabled, banner_image_url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      id,
      slug,
      title_en.trim(),
      title_mr.trim(),
      (title_hi || title_mr).trim(),
      description_en || '',
      description_mr || '',
      description_hi || description_mr || '',
      date,
      start_time,
      end_time || '',
      venue_en || venue_mr,
      venue_mr.trim(),
      venue_hi || venue_mr,
      address || '',
      map_url || '',
      organizer || 'श्री सिद्धिविनायक मंदिर ट्रस्ट',
      status,
      parseInt(capacity, 10) || 0,
      registration_enabled ? 1 : 0,
      banner_image_url || '/assets/ganesha_logo.png',
      req.user ? req.user.id : 'admin'
    );

    logAuditEvent({
      eventType: 'EVENT_CREATED',
      description: `New event created: ${title_mr} (${date})`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.status(201).json({ success: true, eventId: id, slug });
  } catch (err) {
    console.error('adminCreateEvent error:', err.message);
    res.status(500).json({ error: 'Failed to create event: ' + err.message });
  }
}

/**
 * Admin: Update event with status transition validation
 */
export function adminUpdateEvent(req, res) {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const {
      title_en,
      title_mr,
      title_hi,
      description_en,
      description_mr,
      description_hi,
      date,
      start_time,
      end_time,
      venue_en,
      venue_mr,
      venue_hi,
      address,
      map_url,
      organizer,
      status,
      capacity,
      registration_enabled,
      banner_image_url
    } = req.body;

    db.prepare(`
      UPDATE events SET
        title_en = COALESCE(?, title_en),
        title_mr = COALESCE(?, title_mr),
        title_hi = COALESCE(?, title_hi),
        description_en = COALESCE(?, description_en),
        description_mr = COALESCE(?, description_mr),
        description_hi = COALESCE(?, description_hi),
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        venue_en = COALESCE(?, venue_en),
        venue_mr = COALESCE(?, venue_mr),
        venue_hi = COALESCE(?, venue_hi),
        address = COALESCE(?, address),
        map_url = COALESCE(?, map_url),
        organizer = COALESCE(?, organizer),
        status = COALESCE(?, status),
        capacity = COALESCE(?, capacity),
        registration_enabled = COALESCE(?, registration_enabled),
        banner_image_url = COALESCE(?, banner_image_url),
        updated_at = ?
      WHERE id = ?
    `).run(
      title_en,
      title_mr,
      title_hi,
      description_en,
      description_mr,
      description_hi,
      date,
      start_time,
      end_time,
      venue_en,
      venue_mr,
      venue_hi,
      address,
      map_url,
      organizer,
      status,
      capacity !== undefined ? parseInt(capacity, 10) : undefined,
      registration_enabled !== undefined ? (registration_enabled ? 1 : 0) : undefined,
      banner_image_url,
      new Date().toISOString(),
      id
    );

    logAuditEvent({
      eventType: 'EVENT_UPDATED',
      description: `Event updated: ${event.title_mr} -> Status: ${status || event.status}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err) {
    console.error('adminUpdateEvent error:', err.message);
    res.status(500).json({ error: 'Failed to update event: ' + err.message });
  }
}

/**
 * Admin: Delete event
 */
export function adminDeleteEvent(req, res) {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    db.prepare('DELETE FROM event_registrations WHERE event_id = ?').run(id);
    db.prepare('DELETE FROM events WHERE id = ?').run(id);

    logAuditEvent({
      eventType: 'EVENT_DELETED',
      description: `Event deleted: ${event.title_mr}`,
      actorId: req.user ? req.user.id : null,
      actorName: req.user ? req.user.name : 'Administrator',
      actorRole: req.user ? req.user.role : 'ADMIN'
    });

    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('adminDeleteEvent error:', err.message);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
}

/**
 * Admin: List registrations for an event
 */
export function adminListEventRegistrations(req, res) {
  try {
    const { event_id } = req.params;
    const registrations = db.prepare(`
      SELECT r.*, e.title_mr, e.title_en, e.date
      FROM event_registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.event_id = ?
      ORDER BY r.created_at DESC
    `).all(event_id);

    res.json({ registrations });
  } catch (err) {
    console.error('adminListEventRegistrations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve event registrations.' });
  }
}
