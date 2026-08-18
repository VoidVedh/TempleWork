import db from '../config/database.js';

export function getAuditLogs(req, res) {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (description LIKE ? OR event_type LIKE ? OR actor_name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY timestamp DESC, rowid DESC';

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}
