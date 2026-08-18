import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { JWT_SECRET } from '../middlewares/authMiddleware.js';
import { logAuditEvent } from '../utils/auditLogger.js';

export async function login(req, res) {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required.' });
    }

    const cleanMobile = mobile.trim();
    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(cleanMobile);

    if (!user) {
      return res.status(401).json({ error: 'नोंदणीकृत मोबाईल नंबर सापडला नाही (Invalid Mobile Number)' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'हे खाते निष्क्रिय आहे. कृपया अध्यक्षांशी संपर्क साधा.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'चुकीचा पासवर्ड (Incorrect Password)' });
    }

    const token = jwt.sign(
      { id: user.id, mobile: user.mobile, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      name_mr: user.name_mr,
      mobile: user.mobile,
      role: user.role,
      can_change_payment_status: !!user.can_change_payment_status,
      can_manage_expenses: !!user.can_manage_expenses,
      is_active: !!user.is_active,
      is_protected_founder: !!user.is_protected_founder
    };

    // Log audit event
    const displayName = `${user.name} (${user.name_mr})`;
    const roleName = user.role === 'ADMIN' ? '[अध्यक्ष/Admin]' : '[कार्यकर्ता/Member]';
    logAuditEvent('USER_LOGIN', `${displayName} ${roleName} logged in successfully.`, safeUser);

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
}

export function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

export function logout(req, res) {
  if (req.user) {
    const displayName = `${req.user.name} (${req.user.name_mr})`;
    logAuditEvent('USER_LOGOUT', `${displayName} logged out.`, req.user);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}
