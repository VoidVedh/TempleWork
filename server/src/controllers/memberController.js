import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/database.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { seedInitialData } from '../seed/seedData.js';

export function getMembersAndLeaderboard(req, res) {
  try {
    // 1. Fetch all members
    const members = db.prepare(`
      SELECT id, name, name_mr, mobile, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder, created_at
      FROM users
      ORDER BY is_protected_founder DESC, created_at ASC
    `).all();

    // 2. Compute leaderboard from actual paid receipts
    const leaderboardStats = db.prepare(`
      SELECT collector_id, COUNT(*) as receipt_count, SUM(amount) as total_collected
      FROM receipts
      WHERE payment_status = 'Paid'
      GROUP BY collector_id
    `).all();

    const statsMap = {};
    leaderboardStats.forEach(stat => {
      statsMap[stat.collector_id] = {
        receipt_count: stat.receipt_count,
        total_collected: stat.total_collected
      };
    });

    const leaderboard = members.map(m => {
      const stat = statsMap[m.id] || { receipt_count: 0, total_collected: 0 };
      return {
        id: m.id,
        name: m.name,
        name_mr: m.name_mr,
        role: m.role,
        receipt_count: stat.receipt_count,
        total_collected: stat.total_collected
      };
    }).sort((a, b) => b.total_collected - a.total_collected);

    res.json({ members, leaderboard });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to retrieve members and leaderboard.' });
  }
}

export async function createMember(req, res) {
  try {
    const { name, name_mr, mobile, password, role, can_change_payment_status, can_manage_expenses, is_active } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ error: 'सदस्याचे नाव, मोबाईल नंबर आणि पासवर्ड आवश्यक आहेत.' });
    }

    const cleanMobile = mobile.trim();
    const existing = db.prepare('SELECT id FROM users WHERE mobile = ?').get(cleanMobile);
    if (existing) {
      return res.status(400).json({ error: 'हा मोबाईल नंबर आधीच नोंदणीकृत आहे (Mobile number already exists).' });
    }

    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 10);
    const roleValue = role && (role.includes('ADMIN') || role === 'ADMIN') ? 'ADMIN' : 'MEMBER';
    const nameMarathi = name_mr || name;

    const stmt = db.prepare(`
      INSERT INTO users (id, name, name_mr, mobile, password_hash, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      id,
      name.trim(),
      nameMarathi.trim(),
      cleanMobile,
      password_hash,
      roleValue,
      can_change_payment_status ? 1 : 0,
      can_manage_expenses ? 1 : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    const createdUser = db.prepare('SELECT id, name, name_mr, mobile, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder FROM users WHERE id = ?').get(id);

    // Audit log
    const actorDisplayName = `${req.user.name} (${req.user.name_mr})`;
    const roleLabel = roleValue === 'ADMIN' ? 'अध्यक्ष' : 'कार्यकर्ता';
    const auditDesc = `नवीन सदस्य जोडला: ${name} (${roleLabel}, मो. ${cleanMobile}) द्वारे ${actorDisplayName}`;
    logAuditEvent('CREATE_USER', auditDesc, req.user);

    res.status(201).json({ member: createdUser });
  } catch (err) {
    console.error('Create member error:', err);
    res.status(500).json({ error: 'Failed to create member.' });
  }
}

export async function updateMember(req, res) {
  try {
    const { id } = req.params;
    const { name, name_mr, role, can_change_payment_status, can_manage_expenses, is_active, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'सदस्य सापडला नाही (Member not found).' });
    }

    let password_hash = user.password_hash;
    if (password && password.trim().length > 0) {
      password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedRole = user.is_protected_founder ? 'ADMIN' : (role || user.role);

    db.prepare(`
      UPDATE users
      SET name = ?, name_mr = ?, role = ?, can_change_payment_status = ?, can_manage_expenses = ?, is_active = ?, password_hash = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : user.name,
      name_mr ? name_mr.trim() : user.name_mr,
      updatedRole,
      can_change_payment_status !== undefined ? (can_change_payment_status ? 1 : 0) : user.can_change_payment_status,
      can_manage_expenses !== undefined ? (can_manage_expenses ? 1 : 0) : user.can_manage_expenses,
      is_active !== undefined ? (is_active ? 1 : 0) : user.is_active,
      password_hash,
      id
    );

    const updated = db.prepare('SELECT id, name, name_mr, mobile, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder FROM users WHERE id = ?').get(id);

    logAuditEvent('UPDATE_MEMBER', `सदस्य माहिती/अधिकार बदलले: ${updated.name} (${updated.mobile})`, req.user);

    res.json({ member: updated });
  } catch (err) {
    console.error('Update member error:', err);
    res.status(500).json({ error: 'Failed to update member.' });
  }
}

export function deleteMember(req, res) {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ error: 'सदस्य सापडला नाही.' });
    }

    if (user.is_protected_founder) {
      return res.status(400).json({ error: 'मुख्य संस्थापक अध्यक्ष खाते हटवता येत नाही (Cannot delete protected founder account).' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    logAuditEvent('DELETE_USER', `सदस्य हटवला: ${user.name} (${user.mobile})`, req.user);

    res.json({ success: true, message: 'Member deleted.' });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'Failed to delete member.' });
  }
}

export function resetDemoData(req, res) {
  try {
    seedInitialData();
    logAuditEvent('RESET_DATA', 'संपूर्ण डेमो डेटा रीसेट करण्यात आला (Database reset to baseline).', req.user);
    res.json({ success: true, message: 'डेटा यशस्वीरित्या पूर्ववत केला.' });
  } catch (err) {
    console.error('Reset data error:', err);
    res.status(500).json({ error: 'Failed to reset data.' });
  }
}
