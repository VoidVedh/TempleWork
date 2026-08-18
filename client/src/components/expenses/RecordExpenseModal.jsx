import React, { useState } from 'react';
import { AlertCircle, Check, Upload, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiRequest } from '../../utils/api';
import Modal from '../common/Modal';

export const EXPENSE_CATEGORIES = [
  'मंडप व स्टेज व्यवस्था (Mandap & Stage Setup)',
  'महाप्रसाद व भोजन (Mahaprasad & Food)',
  'डेकोरेशन व लाईटिंग (Decoration & Lighting)',
  'पूजा व विधी साहित्य (Puja Materials)',
  'ध्वनी व ध्वनिक्षेपक (Sound System)',
  'मिरवणूक व वाद्य (Procession & Music)',
  'परवानगी व पोलीस खर्च (Permissions & Police)',
  'इतर विविध खर्च (Miscellaneous)'
];

export const PAYMENT_METHODS = [
  '💵 कॅश (Cash)',
  '📱 Google Pay (UPI)',
  '📱 PhonePe',
  '📱 Paytm',
  '🏦 Net Banking'
];

export default function RecordExpenseModal({ isOpen, onClose, onExpenseCreated }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [authorizedBy, setAuthorizedBy] = useState(user ? `${user.name_mr || user.name}` : '');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [billFile, setBillFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !paidTo) {
      setError('कृपया सर्व आवश्यक (*) रकाने भरा (Please fill all required fields).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('amount', amount);
      formData.append('paid_to', paidTo);
      formData.append('payment_method', paymentMethod);
      formData.append('authorized_by', authorizedBy || `${user?.name_mr || user?.name}`);
      formData.append('expense_date', expenseDate);
      formData.append('reason', reason);

      if (billFile) {
        formData.append('bill_attachment', billFile);
      }

      const res = await apiRequest('/expenses', {
        method: 'POST',
        body: formData
      });

      // Reset form
      setTitle('');
      setAmount('');
      setPaidTo('');
      setReason('');
      setBillFile(null);

      if (onExpenseCreated) {
        onExpenseCreated(res.expense);
      }
      onClose();
    } catch (err) {
      console.error('Create expense error:', err);
      setError(err.message || 'खर्च नोंदवताना त्रुटी आली.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('recordExpenseModalTitle')}
      icon={AlertCircle}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', marginBottom: '12px', fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* 1. Title */}
        <div className="form-group">
          <label className="form-label">
            {t('expTitleField')} <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className="form-input no-icon"
            placeholder={t('expTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            id="input-expense-title"
          />
        </div>

        {/* 2. Category & Amount */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('categoryField')}</label>
            <select
              className="form-select no-icon"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              id="select-expense-category"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('expAmountField')} <span className="required-star">*</span>
            </label>
            <input
              type="number"
              className="form-input no-icon"
              placeholder={t('expAmountPlaceholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              id="input-expense-amount"
            />
          </div>
        </div>

        {/* 3. Paid To & Payment Method */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              {t('paidToField')} <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="form-input no-icon"
              placeholder={t('paidToPlaceholder')}
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              required
              id="input-expense-paid-to"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('payMethodField')}</label>
            <select
              className="form-select no-icon"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              id="select-expense-payment-method"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Authorized Person & Date */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('authPersonField')}</label>
            <input
              type="text"
              className="form-input no-icon"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              id="input-expense-auth-person"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('expDateField')}</label>
            <input
              type="date"
              className="form-input no-icon"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              id="input-expense-date"
            />
          </div>
        </div>

        {/* 5. Detailed Reason */}
        <div className="form-group">
          <label className="form-label">{t('reasonField')}</label>
          <textarea
            className="form-textarea no-icon"
            rows="2"
            placeholder={t('reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            id="textarea-expense-reason"
          ></textarea>
        </div>

        {/* 6. Bill Attachment */}
        <div className="form-group">
          <label className="form-label">{t('attachmentField')}</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="form-input no-icon"
            onChange={(e) => setBillFile(e.target.files[0])}
            id="input-expense-attachment"
          />
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-outline-white"
            style={{ color: '#475569', borderColor: '#cbd5e1' }}
            onClick={onClose}
          >
            {t('cancelBtn')}
          </button>
          <button
            type="submit"
            className="btn btn-crimson"
            disabled={submitting}
            id="btn-submit-expense"
          >
            <Check size={16} />
            <span>{submitting ? 'नोंद होत आहे...' : t('submitExpenseBtn')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
