import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ekdant-secret-key-2024-sacred-mandal';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    const row = db.prepare('SELECT id, name, name_mr, mobile, email, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder FROM users WHERE id = ?').get(user.id);
    
    if (!row || !row.is_active) {
      return res.status(403).json({ error: 'User account is inactive or not found.' });
    }

    req.user = row;
    next();
  });
}

// Optional Auth (populates req.user if valid token provided, but does not block guests)
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err && user) {
      const row = db.prepare('SELECT id, name, name_mr, mobile, email, role, can_change_payment_status, can_manage_expenses, is_active, is_protected_founder FROM users WHERE id = ?').get(user.id);
      if (row && row.is_active) {
        req.user = row;
      }
    }
    next();
  });
}

// Generic RBAC Role Checker
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // SUPER_ADMIN has unconditional access
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: `Permission denied. Required role: ${allowedRoles.join(' or ')}.` });
  };
}

export function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required.' });
  }
}

export function requireEventManager(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'EVENT_MANAGER')) {
    next();
  } else {
    res.status(403).json({ error: 'Event manager authorization required.' });
  }
}

export function requireContentManager(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'CONTENT_MANAGER')) {
    next();
  } else {
    res.status(403).json({ error: 'Content manager authorization required.' });
  }
}

export function requireTreasurer(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'TREASURER')) {
    next();
  } else {
    res.status(403).json({ error: 'Treasurer authorization required.' });
  }
}

export function requireExpenseAuthority(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'TREASURER' || req.user.can_manage_expenses === 1)) {
    next();
  } else {
    res.status(403).json({ error: 'Authority to manage expenses required.' });
  }
}

export function requirePaymentStatusAuthority(req, res, next) {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || req.user.role === 'TREASURER' || req.user.can_change_payment_status === 1)) {
    next();
  } else {
    res.status(403).json({ error: 'Authority to modify payment status required.' });
  }
}

export { JWT_SECRET };

