import db from '../config/database.js';

/**
 * Get notifications for authenticated user (including global broadcasts)
 */
export function getUserNotifications(req, res) {
  try {
    const userId = req.user ? req.user.id : null;

    let notifications = [];
    if (userId) {
      notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY created_at DESC 
        LIMIT 30
      `).all(userId);
    } else {
      notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id IS NULL
        ORDER BY created_at DESC 
        LIMIT 10
      `).all();
    }

    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('getUserNotifications error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark notification as read
 */
export function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('markNotificationRead error:', err.message);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

/**
 * Mark all as read
 */
export function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    if (userId) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL').run(userId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err.message);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}
