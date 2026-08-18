import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Phone,
  User,
  Hash,
  CreditCard,
  CheckCircle2,
  Info,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANDAL_UPI_CONFIG, buildUpiDeepLink } from '../config/upiConfig';
import { apiRequest } from '../utils/api';
import { formatIndianCurrency } from '../utils/numberToWords';
import HeroBanner from '../components/layout/HeroBanner';

const QUICK_AMOUNTS = [101, 251, 501, 1001, 2100, 5001, 11000];

export default function PayVarganiView({ onNavigate }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [amount, setAmount] = useState('501');
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);

  // UTR Form State
  const [donorName, setDonorName] = useState(user ? user.name : '');
  const [donorMobile, setDonorMobile] = useState(user && user.role !== 'ADMIN' ? user.mobile : '');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay / PhonePe');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const qrCanvasRef = useRef(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  // Generate Real Dynamic UPI QR
  useEffect(() => {
    if (!qrCanvasRef.current) return;

    try {
      const upiPayload = buildUpiDeepLink({
        amount: isValidAmount ? parsedAmount : null,
        note: 'Ekdant Ganeshotsav Vargani'
      });

      QRCode.toCanvas(
        qrCanvasRef.current,
        upiPayload,
        {
          width: 220,
          margin: 1.5,
          color: {
            dark: '#3b0709', // Sacred deep maroon dots
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        (error) => {
          if (error) {
            console.error('QR Render error:', error);
            setQrError(true);
          } else {
            setQrError(false);
          }
        }
      );
    } catch (err) {
      console.error('QR generation exception:', err);
      setQrError(true);
    }
  }, [amount, isValidAmount, parsedAmount]);

  const handleCopyUpiId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(MANDAL_UPI_CONFIG.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePayDirectly = () => {
    if (!isValidAmount) {
      alert('कृपया आधी वैध रक्कम टाका.');
      return;
    }
    const upiLink = buildUpiDeepLink({
      amount: parsedAmount,
      note: 'Ekdant Ganeshotsav Vargani'
    });
    window.location.href = upiLink;
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (!donorName.trim()) {
      setErrorMessage('कृपया दात्याचे नाव टाका.');
      return;
    }
    if (!isValidAmount) {
      setErrorMessage('कृपया वैध वर्गणी रक्कम भरा.');
      return;
    }
    if (!utrNumber.trim() || utrNumber.trim().length < 4) {
      setErrorMessage('कृपया वैध 12-अंकी UPI Transaction ID / UTR क्रमांक टाका.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      const res = await apiRequest('/upi/submit-utr', {
        method: 'POST',
        body: JSON.stringify({
          donor_name: donorName.trim(),
          donor_mobile: donorMobile.trim(),
          amount: parsedAmount,
          upi_ref_no: utrNumber.trim(),
          payment_app: paymentApp,
          notes: notes.trim()
        })
      });

      setSubmissionSuccess(res.contribution);
      setUtrNumber('');
      setNotes('');
    } catch (err) {
      setErrorMessage(err.message || 'वर्गणी नोंद सबमिट करताना त्रुटी आली.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* 1. Hero Banner */}
      <HeroBanner
        theme="maroon"
        tag="॥ श्री गणेशाय नमः ॥ • अधिकृत UPI देणगी"
        title={t('payVarganiTitle')}
        subtitle={t('payVarganiSub')}
      />

      {/* 2. Amount Selection Section */}
      <div className="section-card" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#7f1d1d', fontWeight: 800, fontSize: '13px' }}>
          <Sparkles size={16} color="#d97706" />
          <span>{t('selectAmount')}</span>
        </div>

        {/* Quick Amount Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {QUICK_AMOUNTS.map((amt) => {
            const isSelected = amount === amt.toString();
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: `1.5px solid ${isSelected ? '#991b1b' : '#fed7aa'}`,
                  backgroundColor: isSelected ? '#7f1d1d' : '#fffbeb',
                  color: isSelected ? '#fde047' : '#7c2d12',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 2px 4px rgba(127, 29, 29, 0.2)' : 'none'
                }}
              >
                ₹{amt.toLocaleString('en-IN')}
              </button>
            );
          })}
        </div>

        {/* Custom Amount Input */}
        <div className="input-wrapper">
          <span className="input-icon" style={{ fontWeight: 900, color: '#7f1d1d', fontSize: '15px' }}>₹</span>
          <input
            type="number"
            min="1"
            className="form-input"
            style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}
            placeholder={t('customAmountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            id="input-vargani-amount"
          />
        </div>
      </div>

      {/* 3. Auspicious QR & Direct Pay Card */}
      <div
        className="section-card"
        style={{
          border: '2px solid #fde68a',
          background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
          textAlign: 'center',
          padding: '20px 16px',
          marginBottom: '16px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '3px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, marginBottom: '12px' }}>
          <QrCode size={14} />
          <span>{t('scanQrTitle')}</span>
        </div>

        {/* Dynamic QR Box with double border and Ganesha motif */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div
            style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '2.5px solid #d97706',
              boxShadow: '0 8px 16px -4px rgba(217, 119, 6, 0.15)',
              display: 'inline-block'
            }}
          >
            {qrError ? (
              <div style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', gap: '8px', padding: '16px' }}>
                <AlertCircle size={32} />
                <span style={{ fontSize: '11px', fontWeight: 700 }}>QR लोड करण्यात त्रुटी आली. कृपया खालील UPI ID वापरा.</span>
              </div>
            ) : (
              <canvas ref={qrCanvasRef} style={{ display: 'block', borderRadius: '8px' }} />
            )}

            {isValidAmount && (
              <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 900, color: '#7f1d1d' }}>
                रक्कम: ₹{parsedAmount.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Official UPI ID Pill with Copy */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor: '#ffffff',
            border: '1.5px dashed #d97706',
            borderRadius: '10px',
            padding: '8px 14px',
            maxWidth: '100%',
            marginBottom: '14px'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '9.5px', color: '#92400e', fontWeight: 800, textTransform: 'uppercase' }}>
              अधिकृत मंडळ UPI ID
            </div>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>
              {MANDAL_UPI_CONFIG.upiId}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleCopyUpiId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: copied ? '#dcfce7' : '#fef3c7',
              color: copied ? '#15803d' : '#92400e',
              border: `1px solid ${copied ? '#86efac' : '#fde68a'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
            id="btn-copy-upi-id"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'कॉपी झाले!' : t('copyUpiBtn')}</span>
          </button>
        </div>

        {copied && (
          <div style={{ color: '#15803d', fontSize: '11px', fontWeight: 800, marginBottom: '10px' }}>
            {t('upiIdCopiedToast')}
          </div>
        )}

        {/* Pay Directly Button (Mobile Deep Link) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handlePayDirectly}
            className="btn btn-gold"
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '12px 18px',
              fontSize: '14px',
              fontWeight: 900,
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.35)'
            }}
            id="btn-pay-directly-upi"
          >
            <ExternalLink size={16} />
            <span>{t('payDirectlyBtn')}</span>
          </button>
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
          {t('scanQrHelp')}
        </div>
      </div>

      {/* 4. Important Notice Box */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1.5px solid #bfdbfe',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}
      >
        <Info size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '11.5px', color: '#1e3a8a', lineHeight: 1.4 }}>
          <strong style={{ display: 'block', marginBottom: '2px' }}>{t('afterPaymentNotice')}</strong>
          UPI ॲपमध्ये पेमेंट यशस्वी झाल्यावर आलेला <strong>12-अंकी UTR / Transaction ID</strong> खालील फॉर्ममध्ये नोंदवा जेणेकरून अधिकृत पावती तयार होईल.
        </div>
      </div>

      {/* 5. UTR Submission Form Card */}
      <div className="section-card" style={{ padding: '16px 18px' }}>
        <div className="section-header-row" style={{ marginBottom: '14px' }}>
          <div className="section-title">
            <ShieldCheck size={18} color="#059669" />
            <span>{t('utrFormTitle')}</span>
          </div>
        </div>

        {submissionSuccess ? (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px' }} />
            <strong style={{ fontSize: '14px', color: '#166534', display: 'block', marginBottom: '4px' }}>
              वर्गणी नोंद यशस्वीरित्या सादर झाली!
            </strong>
            <div style={{ fontSize: '11.5px', color: '#15803d', marginBottom: '12px' }}>
              नोंदणी क्र. UTR: <strong>{submissionSuccess.upi_ref_no}</strong> | रक्कम: <strong>₹{submissionSuccess.amount}</strong>
              <br />
              अध्यक्षांच्या पडताळणीनंतर अधिकृत पावती आपल्या खात्यावर उपलब्ध होईल.
            </div>

            <button
              type="button"
              className="btn btn-green"
              onClick={() => {
                setSubmissionSuccess(null);
                onNavigate('dashboard');
              }}
              style={{ margin: '0 auto', fontSize: '12px' }}
            >
              डॅशबोर्डवर परत जा (Go to Dashboard)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitUtr}>
            {errorMessage && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', marginBottom: '12px', fontWeight: 700 }}>
                {errorMessage}
              </div>
            )}

            {/* Donor Name */}
            <div className="form-group">
              <label className="form-label">{t('donorNameField')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={16} /></span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('donorNamePlaceholder')}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  required
                  id="input-utr-donor-name"
                />
              </div>
            </div>

            {/* WhatsApp Mobile */}
            <div className="form-group">
              <label className="form-label">{t('whatsappField')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><Phone size={16} /></span>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-input"
                  placeholder={t('whatsappPlaceholder')}
                  value={donorMobile}
                  onChange={(e) => setDonorMobile(e.target.value.replace(/\D/g, ''))}
                  id="input-utr-mobile"
                />
              </div>
            </div>

            {/* UPI Transaction ID / UTR */}
            <div className="form-group">
              <label className="form-label">{t('utrField')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><Hash size={16} /></span>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.5px' }}
                  placeholder={t('utrPlaceholder')}
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  required
                  id="input-utr-ref-no"
                />
              </div>
            </div>

            {/* UPI App Used */}
            <div className="form-group">
              <label className="form-label">{t('appUsedField')}</label>
              <div className="input-wrapper">
                <span className="input-icon"><CreditCard size={16} /></span>
                <select
                  className="form-select"
                  value={paymentApp}
                  onChange={(e) => setPaymentApp(e.target.value)}
                  id="select-utr-app"
                >
                  <option value="Google Pay">Google Pay (GPay)</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Paytm">Paytm</option>
                  <option value="BHIM UPI">BHIM UPI</option>
                  <option value="CRED / Other UPI">CRED / इतर बँक UPI ॲप</option>
                </select>
              </div>
            </div>

            {/* Notes / Special Sankalp */}
            <div className="form-group">
              <label className="form-label">संकल्प / विशेष नोंद (ऐच्छिक):</label>
              <input
                type="text"
                className="form-input"
                placeholder="उदा. महाप्रसाद / आरती देणगी"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                id="input-utr-notes"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-crimson"
              style={{ width: '100%', padding: '12px', fontSize: '13.5px', fontWeight: 900, marginTop: '8px' }}
              disabled={submitting}
              id="btn-submit-utr-form"
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'नोंद सादर करत आहे...' : t('submitUtrBtn')}</span>
            </button>

            <div style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'center', marginTop: '10px' }}>
              {t('upiVerificationNotice')}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
