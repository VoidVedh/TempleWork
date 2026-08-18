import db from '../config/database.js';
import crypto from 'crypto';

export function logAuditEvent(eventType, description, actor) {
  try {
    const id = crypto.randomUUID();
    const actorId = actor ? actor.id : null;
    const actorName = actor ? (actor.name_mr || actor.name) : 'सिस्टम (System)';
    const actorRole = actor ? (actor.role === 'ADMIN' ? 'अध्यक्ष' : 'कार्यकर्ता') : 'System';

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, event_type, description, actor_id, actor_name, actor_role, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    stmt.run(id, eventType, description, actorId, actorName, actorRole);
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
