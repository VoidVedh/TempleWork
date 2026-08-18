import React, { useState } from 'react';
import { User, Phone, MapPin, IndianRupee, FileText, Check, FileCheck, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { apiRequest } from '../utils/api';
import { numberToWordsIndian } from '../utils/numberToWords';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';

const QUICK_AMOUNTS = [101, 251, 501, 1001, 2100, 5001, 11000, 21000];
const PAYMENT_MODES = [
  '📱 Paytm',
  '📱 Google Pay (UPI)',
  '📱 PhonePe',
  '💵 Cash',
  '🏦 Net Banking'
];

export default function NewReceiptView({ onNavigate }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { refreshStats } = useData();

  const [donorName, setDonorName] = useState('');
  const [donorMobile, setDonorMobile] = useState('');
  const [addressGalli, setAddressGalli] = useState('');
  const [amount, setAmount] = useState('5000');
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  const amountInWords = numberToWordsIndian(amount);

  const handleSelectQuickAmount = (val) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!donorName || !amount) {
      setError('कृपया दात्याचे नाव आणि रक्कम भरा.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        donor_name: donorName,
        donor_mobile: donorMobile,
        address_galli: addressGalli,
        amount: parseFloat(amount),
        amount_in_words: amountInWords,
        payment_mode: paymentMode.replace(/^[^\w\s]+/, '').trim() || paymentMode,
        payment_status: paymentStatus,
        notes
      };

      const res = await apiRequest('/receipts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Trigger festive celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      // Refresh dashboard data
      await refreshStats();

      // Set created receipt and open certificate modal
      setCreatedReceipt(res.receipt);
      setIsCertificateOpen(true);

      // Reset fields
      setDonorName('');
      setDonorMobile('');
      setAddressGalli('');
      setNotes('');
    } catch (err) {
      console.error('Create receipt error:', err);
      setError(err.message || 'पावती तयार करताना त्रुटी आली.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Header Banner */}
      <div className="hero-card theme-maroon" style={{ marginBottom: '14px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 className="hero-title" style={{ fontSize: '17px' }}>{t('newReceiptTitle')}</h1>
            <p className="hero-subtitle" style={{ fontSize: '10.5px' }}>{t('newReceiptSub')}</p>
          </div>
          <button
            className="btn btn-outline-white"
            style={{ fontSize: '11px', padding: '5px 10px' }}
            onClick={() => onNavigate('dashboard')}
          >
            <ArrowLeft size={14} />
            <span>डॅशबोर्डवर जा</span>
          </button>
        </div>
      </div>

      {/* Form Container Card */}
      <div className="form-card">
        {/* Collector Identity Banner */}
        {user && (
          <div className="collector-banner-box">
            <div className="collector-banner-left">
              <div className="avatar-circle">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="collector-banner-text">
                <span className="collector-tag">{t('receiptCreatedBy')}</span>
                <span className="collector-name">
                  {user.name} ({user.name_mr || user.name}){' '}
                  <span className="role-tag-crown" style={{ marginLeft: '4px' }}>
                    {user.role === 'ADMIN' ? 'मुख्य अध्यक्ष' : 'कार्यकर्ता'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>
                    (मो. : {user.mobile})
                  </span>
                </span>
              </div>
            </div>
            <span style={{ fontSize: '9px', backgroundColor: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              {t('nameOnReceiptNotice')}
            </span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', marginBottom: '14px', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Donor Name */}
          <div className="form-group">
            <label className="form-label">
              {t('donorName')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon"><User size={16} /></span>
              <input
                type="text"
                className="form-input"
                placeholder={t('donorPlaceholder')}
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
                id="input-donor-name"
              />
            </div>
          </div>

          {/* 2. Mobile & Address */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('mobileNumber')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><Phone size={16} /></span>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-input"
                  placeholder="9876543210"
                  value={donorMobile}
                  onChange={(e) => setDonorMobile(e.target.value.replace(/\D/g, ''))}
                  id="input-donor-mobile"
                />
              </div>
              <div className="form-help-text">{t('mobileHelp')}</div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('addressGalli')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><MapPin size={16} /></span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('addressPlaceholder')}
                  value={addressGalli}
                  onChange={(e) => setAddressGalli(e.target.value)}
                  id="input-donor-address"
                />
              </div>
            </div>
          </div>

          {/* 3. Amount & Quick Chips */}
          <div className="form-group">
            <label className="form-label">
              {t('amount')} <span className="required-star">*</span>
            </label>
            <div className="input-wrapper">
              <span className="input-icon"><IndianRupee size={16} color="#d97706" /></span>
              <input
                type="number"
                className="form-input amount-highlight"
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                id="input-receipt-amount"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="quick-chips-wrap">
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, alignSelf: 'center' }}>
                Quick Amounts:
              </span>
              {QUICK_AMOUNTS.map((val) => (
                <button
                  type="button"
                  key={val}
                  className="quick-chip"
                  onClick={() => handleSelectQuickAmount(val)}
                  id={`btn-chip-${val}`}
                >
                  ₹{val.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {/* Amount in Words Banner */}
            <div className="words-converter-box">
              <span>{t('amountInWordsPrefix')}</span>
              <span>{amountInWords}</span>
            </div>
          </div>

          {/* 4. Payment Mode & Payment Status */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('paymentMode')}</label>
              <select
                className="form-select no-icon"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                id="select-payment-mode"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('paymentStatus')}</label>
              <div className="segmented-status-wrap">
                <button
                  type="button"
                  className={`seg-btn ${paymentStatus === 'Paid' ? 'active paid' : ''}`}
                  onClick={() => setPaymentStatus('Paid')}
                  id="btn-status-paid"
                >
                  <Check size={14} />
                  <span>{t('statusPaid')}</span>
                </button>

                <button
                  type="button"
                  className={`seg-btn ${paymentStatus === 'Unpaid' ? 'active unpaid' : ''}`}
                  onClick={() => setPaymentStatus('Unpaid')}
                  id="btn-status-unpaid"
                >
                  <span>{t('statusUnpaid')}</span>
                </button>
              </div>
              <div className="form-help-text">
                {paymentStatus === 'Paid' ? t('statusPaidHelp') : t('statusUnpaidHelp')}
              </div>
            </div>
          </div>

          {/* 5. Notes / Description */}
          <div className="form-group">
            <label className="form-label">{t('notesDesc')}</label>
            <div className="input-wrapper">
              <span className="input-icon"><FileText size={16} /></span>
              <input
                type="text"
                className="form-input"
                placeholder={t('notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                id="input-receipt-notes"
              />
            </div>
          </div>

          {/* Reassurance Notice */}
          <div style={{ fontSize: '10.5px', color: '#78716c', fontStyle: 'italic', margin: '14px 0 10px' }}>
            {t('formNotice')}
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            className="btn btn-maroon"
            style={{ width: '100%', padding: '12px', fontSize: '14px', borderRadius: '10px' }}
            disabled={submitting}
            id="btn-generate-receipt"
          >
            <FileCheck size={18} />
            <span>{submitting ? 'पावती तयार होत आहे...' : t('generateReceiptBtn')}</span>
          </button>
        </form>
      </div>

      {/* Generated Receipt Certificate Modal */}
      <ReceiptCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => {
          setIsCertificateOpen(false);
          onNavigate('dashboard');
        }}
        receipt={createdReceipt}
      />
    </div>
  );
}
