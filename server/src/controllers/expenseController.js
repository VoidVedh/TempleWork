import db from '../config/database.js';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

export function createExpense(req, res) {
  try {
    const { title, category, amount, paid_to, payment_method, authorized_by, expense_date, reason } = req.body;

    if (!title || !amount || !paid_to) {
      return res.status(400).json({ error: 'खर्चाचे नाव, रक्कम आणि ज्यांना दिले त्यांचे नाव आवश्यक आहे.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'अवैध रक्कम (Invalid amount).' });
    }

    const currentYear = 2024;
    const countRow = db.prepare('SELECT COUNT(*) as count FROM expenses').get();
    const nextSeq = (countRow.count + 1).toString().padStart(4, '0');
    const voucher_no = `EXP-${currentYear}-${nextSeq}`;

    const id = crypto.randomUUID();
    const recorder_id = req.user.id;
    const recorder_name = `${req.user.name} (${req.user.name_mr})`;
    const authPerson = authorized_by || recorder_name;
    const expDate = expense_date || new Date().toISOString().split('T')[0];
    const billUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.bill_attachment_url || null);

    const stmt = db.prepare(`
      INSERT INTO expenses (id, voucher_no, title, category, amount, paid_to, payment_method, authorized_by, recorder_id, recorder_name, expense_date, reason, bill_attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      voucher_no,
      title.trim(),
      category || 'मंडप व स्टेज व्यवस्था (Mandap & Stage Setup)',
      numAmount,
      paid_to.trim(),
      payment_method || 'Cash',
      authPerson.trim(),
      recorder_id,
      recorder_name,
      expDate,
      reason ? reason.trim() : '',
      billUrl
    );

    const createdExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

    // Audit log
    const auditDesc = `खर्च नोंदवला: क्र. ${voucher_no} | ₹${numAmount} | ${title} (${category || title}) | दिले: ${paid_to} | अधिकार: ${authPerson} | नोंदणीकर्ता: ${recorder_name}`;
    logAuditEvent('ADD_EXPENSE', auditDesc, req.user);

    res.status(201).json({ expense: createdExpense });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to record expense.' });
  }
}

export function listExpenses(req, res) {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (category && category !== 'all' && category !== 'सर्व खर्च (All Categories)') {
      query += ' AND category LIKE ?';
      params.push(`%${category.trim()}%`);
    }

    if (search) {
      query += ' AND (title LIKE ? OR voucher_no LIKE ? OR paid_to LIKE ? OR category LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY expense_date DESC, created_at DESC';

    const expenses = db.prepare(query).all(...params);
    const total_amount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      expenses,
      total_count: expenses.length,
      total_amount
    });
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
}

export function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);

    if (!expense) {
      return res.status(404).json({ error: 'खर्च नोंद सापडली नाही (Expense not found).' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    logAuditEvent(
      'DELETE_EXPENSE',
      `खर्च हटवला: क्र. ${expense.voucher_no} | ₹${expense.amount} | ${expense.title} | दिले: ${expense.paid_to}`,
      req.user
    );

    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
}
