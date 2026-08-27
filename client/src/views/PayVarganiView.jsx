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
  AlertCircle,
  Clock,
  Search,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANDAL_UPI_CONFIG, buildUpiDeepLink } from '../config/upiConfig';
import { apiRequest } from '../utils/api';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatTimestamp } from '../utils/dateUtils';
import HeroBanner from '../components/layout/HeroBanner';

const QUICK_AMOUNTS = [101, 251, 501, 1001, 2100, 5001, 11000];

export default function PayVarganiView({ onNavigate }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('pay'); // 'pay' | 'track'

  // Step 1 Form State
  const [donorName, setDonorName] = useState(user ? user.name : '');
  const [donorMobile, setDonorMobile] = useState(user && user.role !== 'ADMIN' ? user.mobile : '');
  const [amount, setAmount] = useState('501');
  const [notes, setNotes] = useState('');
  const [initiating, setInitiating] = useState(false);

  // Step 2 & 3: Active Intent State
  const [activeIntent, setActiveIntent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay / PhonePe');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Status Tracker Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  const qrCanvasRef = useRef(null);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  // Render Real Dynamic UPI QR when an intent is active
  useEffect(() => {
    if (!qrCanvasRef.current || !activeIntent) return;

    try {
      QRCode.toCanvas(
        qrCanvasRef.current,
        activeIntent.upi_payload,
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
  }, [activeIntent]);

  // 1. Handle Step 1: Initiate Payment Intent
  const handleInitiateIntent = async (e) => {
    e.preventDefault();
    if (!donorName.trim()) {
      setErrorMessage('कृपया दात्याचे पूर्ण नाव टाका.');
      return;
    }
    const cleanMobile = donorMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMessage('कृपया वैध 10-अंकी व्हॉट्सअ‍ॅप मोबाईल नंबर टाका.');
      return;
    }
    if (!isValidAmount) {
      setErrorMessage('कृपया वैध वर्गणी रक्कम भरा.');
      return;
    }

    try {
      setInitiating(true);
      setErrorMessage('');
      const res = await apiRequest('/upi/initiate', {
        method: 'POST',
        body: JSON.stringify({
          donor_name: donorName.trim(),
          donor_mobile: cleanMobile,
          amount: parsedAmount,
          notes: notes.trim(),
          payment_app: paymentApp
        })
      });

      if (res.intent) {
        setActiveIntent(res.intent);
        setUtrNumber('');
        setSubmissionResult(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'पेमेंट हेतू सुरू करताना त्रुटी आली.');
    } finally {
      setInitiating(false);
    }
  };

  // 2. Handle Copying UPI ID
  const handleCopyUpiId = () => {
    const upiId = activeIntent ? activeIntent.upi_id : MANDAL_UPI_CONFIG.upiId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // 3. Handle Pay Directly Button (Mobile UPI Deep Link)
  const handlePayDirectly = () => {
    if (!activeIntent) return;
    window.location.href = activeIntent.upi_link;
  };

  // 4. Handle Submitting UTR
  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 4) {
      setErrorMessage('कृपया वैध 12-अंकी UPI Transaction ID / UTR क्रमांक टाका.');
      return;
    }

    try {
      setSubmittingUtr(true);
      setErrorMessage('');
      const res = await apiRequest('/upi/submit-utr', {
        method: 'POST',
        body: JSON.stringify({
          intent_id: activeIntent ? activeIntent.id : null,
          intent_ref: activeIntent ? activeIntent.intent_ref : null,
          upi_ref_no: utrNumber.trim(),
          payment_app: paymentApp,
          notes: notes.trim()
        })
      });

      setSubmissionResult(res.contribution);
    } catch (err) {
      setErrorMessage(err.message || 'वर्गणी नोंद सबमिट करताना त्रुटी आली.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  // 5. Handle Reset/Change Amount
  const handleResetIntent = () => {
    if (window.confirm('आपण पेमेंट रक्कम बदलू इच्छिता का? सध्याचा पेमेंट संदर्भ रद्द होईल.')) {
      setActiveIntent(null);
      setSubmissionResult(null);
      setUtrNumber('');
      setErrorMessage('');
    }
  };

  // 6. Handle Tracking Status
  const handleTrackStatus = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setTrackingError('कृपया मोबाईल नंबर, UTR किंवा संदर्भ क्रमांक टाका.');
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackingError('');
      setTrackingResult(null);
      const res = await apiRequest(`/upi/status/${encodeURIComponent(searchQuery.trim())}`);
      setTrackingResult(res);
    } catch (err) {
      setTrackingError(err.message || 'कोणतीही नोंद सापडली नाही.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* 1. Hero Banner */}
      <HeroBanner
        theme="maroon"
        tag="॥ श्री गणेशाय नमः ॥ • अधिकृत सुरक्षित UPI देणगी"
        title="वर्गणी भरा (Online UPI Vargani)"
        subtitle="गणरायाच्या चरणी थेट बँक/UPI द्वारे सुरक्षित देणगी द्या. अधिकृत पडताळणीनंतर पावती प्राप्त होईल."
      />

      {/* Navigation Switch Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('pay'); setErrorMessage(''); }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: activeTab === 'pay' ? '2px solid #7f1d1d' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'pay' ? '#7f1d1d' : '#ffffff',
            color: activeTab === 'pay' ? '#fde047' : '#475569',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: activeTab === 'pay' ? '0 4px 6px -1px rgba(127, 29, 29, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
          id="tab-pay-vargani"
        >
          <Sparkles size={16} />
          <span>नवीन वर्गणी भरा (New Contribution)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('track'); setErrorMessage(''); }}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: activeTab === 'track' ? '2px solid #7f1d1d' : '1px solid #e2e8f0',
            backgroundColor: activeTab === 'track' ? '#7f1d1d' : '#ffffff',
            color: activeTab === 'track' ? '#fde047' : '#475569',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: activeTab === 'track' ? '0 4px 6px -1px rgba(127, 29, 29, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
          id="tab-track-vargani"
        >
          <Search size={16} />
          <span>स्थिती तपासा (Track Status)</span>
        </button>
      </div>

      {/* ===================== TAB 1: PAY VARGANI ===================== */}
      {activeTab === 'pay' && (
        <div>
          {/* STEP 1: If No Intent Initiated Yet -> Show Form */}
          {!activeIntent && (
            <div className="section-card" style={{ padding: '18px 20px' }}>
              <div className="section-header-row" style={{ marginBottom: '14px' }}>
                <div className="section-title">
                  <User size={18} color="#7f1d1d" />
                  <span>पायरी १: दात्याची माहिती व वर्गणी रक्कम</span>
                </div>
              </div>

              {errorMessage && (
                <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecdd3', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', fontWeight: 700 }}>
                  <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleInitiateIntent}>
                {/* Donor Full Name */}
                <div className="form-group">
                  <label className="form-label">
                    * दात्याचे पूर्ण नाव (DONOR FULL NAME) :
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={16} /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. आनंद वसंत नाईक / मे. समर्थ इंटरप्रायझेस"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                      id="input-donor-name"
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                    अधिकृत पावतीवर हेच नाव छापले जाईल.
                  </span>
                </div>

                {/* WhatsApp Mobile */}
                <div className="form-group">
                  <label className="form-label">
                    * व्हॉट्सअ‍ॅप मोबाईल नंबर (10-DIGIT WHATSAPP MOBILE) :
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Phone size={16} /></span>
                    <input
                      type="tel"
                      maxLength={10}
                      className="form-input"
                      placeholder="उदा. 9876543210"
                      value={donorMobile}
                      onChange={(e) => setDonorMobile(e.target.value.replace(/\D/g, ''))}
                      required
                      id="input-donor-mobile"
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                    पावती पडताळणी स्थिती तपासण्यासाठी व पावती पाठवण्यासाठी हा नंबर आवश्यक आहे.
                  </span>
                </div>

                {/* Amount Selection */}
                <div className="form-group">
                  <label className="form-label">
                    * वर्गणी रक्कम निवडा किंवा टाका (AMOUNT IN ₹) :
                  </label>

                  {/* Quick Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {QUICK_AMOUNTS.map((amt) => {
                      const isSelected = amount === amt.toString();
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmount(amt.toString())}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            border: `1.5px solid ${isSelected ? '#991b1b' : '#fed7aa'}`,
                            backgroundColor: isSelected ? '#7f1d1d' : '#fffbeb',
                            color: isSelected ? '#fde047' : '#7c2d12',
                            fontSize: '12.5px',
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
                      placeholder="रक्कम टाका (उदा. 501)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      id="input-vargani-amount"
                    />
                  </div>
                </div>

                {/* Sankalp / Notes */}
                <div className="form-group">
                  <label className="form-label">संकल्प / विशेष नोंद (ऐच्छिक):</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. आरती / महाप्रसाद प्रायोजक / कौटुंबिक संकल्प"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    id="input-notes"
                  />
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '11px', color: '#475569', display: 'flex', gap: '8px' }}>
                  <Lock size={15} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    सुरक्षेच्या कारणास्तव पेमेंट सुरू झाल्यावर रक्कम व दात्याचे नाव संदर्भ कोडशी लॉक केले जाईल.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-crimson"
                  style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 900 }}
                  disabled={initiating}
                  id="btn-initiate-vargani"
                >
                  <Sparkles size={16} />
                  <span>{initiating ? 'पेमेंट हेतू सुरू करत आहे...' : 'पुढे जा - UPI पेमेंट सुरू करा ➔'}</span>
                </button>
              </form>
            </div>
          )}

          {/* STEP 2 & 3: Intent Active & QR Payment */}
          {activeIntent && !submissionResult && (
            <div>
              {/* Locked Intent Summary Bar */}
              <div
                style={{
                  backgroundColor: '#7f1d1d',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  boxShadow: '0 4px 6px -1px rgba(127, 29, 29, 0.3)'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#fde047', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔒 लॉक केलेला वर्गणी हेतू (Locked Intent)
                  </div>
                  <strong style={{ fontSize: '15px', color: '#ffffff', display: 'block' }}>
                    {activeIntent.donor_name} (मो. {activeIntent.donor_mobile})
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#fed7aa', fontFamily: 'monospace' }}>
                    संदर्भ क्र.: {activeIntent.intent_ref}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#fde047' }}>
                    {formatIndianCurrency(activeIntent.amount)}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetIntent}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    रक्कम बदला
                  </button>
                </div>
              </div>

              {/* Dynamic QR Box */}
              <div
                className="section-card"
                style={{
                  border: '2px solid #fde68a',
                  background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
                  textAlign: 'center',
                  padding: '20px 16px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '4px 14px', borderRadius: '9999px', fontSize: '11.5px', fontWeight: 800, marginBottom: '12px' }}>
                  <QrCode size={15} />
                  <span>पायरी २: QR स्कॅन करा किंवा डायरेक्ट पे करा</span>
                </div>

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
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>QR लोड करण्यात त्रुटी आली. खालील UPI ID वापरा.</span>
                      </div>
                    ) : (
                      <canvas ref={qrCanvasRef} style={{ display: 'block', borderRadius: '8px' }} />
                    )}

                    <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 900, color: '#7f1d1d' }}>
                      रक्कम: ₹{activeIntent.amount.toLocaleString('en-IN')}
                    </div>
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
                      {activeIntent.upi_id}
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
                    <span>{copied ? 'कॉपी झाले!' : 'UPI ID कॉपी करा'}</span>
                  </button>
                </div>

                {/* Direct Pay Button */}
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
                    <span>मोबाईल UPI ॲप उघडा (Pay Directly)</span>
                  </button>
                </div>
              </div>

              {/* UTR Submission Form */}
              <div className="section-card" style={{ padding: '18px 20px' }}>
                <div className="section-header-row" style={{ marginBottom: '12px' }}>
                  <div className="section-title">
                    <ShieldCheck size={18} color="#059669" />
                    <span>पायरी ३: पेमेंटनंतर आलेला 12-अंकी UTR क्रमांक नोंदवा</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    fontSize: '11.5px',
                    color: '#1e3a8a',
                    lineHeight: 1.4
                  }}
                >
                  <strong>⚠️ महत्त्वाची माहिती:</strong> UPI ॲपमध्ये पेमेंट यशस्वी झाल्यावर आलेला <strong>12-अंकी UTR / Transaction ID</strong> येथे टाकून सबमिट करा. मंडळाच्या अध्यक्षांनी बँक स्टेटमेंटशी पडताळणी केल्यावरच अधिकृत पावती जारी केली जाईल.
                </div>

                {errorMessage && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecdd3', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', fontWeight: 700 }}>
                    <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmitUtr}>
                  {/* UTR Field */}
                  <div className="form-group">
                    <label className="form-label">
                      * 12-अंकी UPI TRANSACTION ID / UTR क्र. :
                    </label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Hash size={16} /></span>
                      <input
                        type="text"
                        className="form-input"
                        style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '1px', fontSize: '15px' }}
                        placeholder="उदा. 423589123456"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        required
                        id="input-utr-ref-no"
                      />
                    </div>
                  </div>

                  {/* App Used */}
                  <div className="form-group">
                    <label className="form-label">वापरलेले UPI ॲप (APP USED):</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><CreditCard size={16} /></span>
                      <select
                        className="form-select"
                        value={paymentApp}
                        onChange={(e) => setPaymentApp(e.target.value)}
                        id="select-payment-app"
                      >
                        <option value="Google Pay">Google Pay (GPay)</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Paytm">Paytm</option>
                        <option value="BHIM UPI">BHIM UPI</option>
                        <option value="CRED / Other UPI">CRED / बँक UPI ॲप</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-green"
                    style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 900 }}
                    disabled={submittingUtr}
                    id="btn-submit-utr"
                  >
                    <CheckCircle2 size={16} />
                    <span>{submittingUtr ? 'नोंद पडताळणीसाठी पाठवत आहे...' : '✓ वर्गणी नोंद पडताळणीसाठी पाठवा'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 4: Successful Submission Confirmation (Pending Verification) */}
          {submissionResult && (
            <div className="section-card" style={{ padding: '24px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  border: '2.5px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Clock size={32} color="#b45309" />
              </div>

              <div style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', fontWeight: 900, marginBottom: '10px' }}>
                🟡 पडताळणी प्रलंबित (Payment Verification Pending)
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#78350f', margin: '0 0 8px' }}>
                आपली वर्गणी पडताळणीसाठी पाठवण्यात आली आहे
              </h3>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, maxWidth: '480px', margin: '0 auto 16px' }}>
                कृपया खालील UTR क्रमांक व संदर्भ क्रमांक जतन करून ठेवा. मंडळाचे अध्यक्ष प्रत्यक्ष बँक खात्यात रक्कम जमा झाल्याची पडताळणी करून अधिकृत पावती जारी करतील.
              </p>

              {/* Receipt Claim Details */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  maxWidth: '440px',
                  margin: '0 auto 20px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>दाता नाव:</span>
                  <strong style={{ color: '#0f172a', fontSize: '12px' }}>{submissionResult.donor_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>मोबाईल:</span>
                  <strong style={{ color: '#0f172a', fontSize: '12px' }}>{submissionResult.donor_mobile}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>वर्गणी रक्कम:</span>
                  <strong style={{ color: '#059669', fontSize: '14px' }}>{formatIndianCurrency(submissionResult.amount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>संदर्भ क्र. (Intent):</span>
                  <strong style={{ color: '#7f1d1d', fontFamily: 'monospace', fontSize: '12px' }}>{submissionResult.intent_ref}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>नोंदवलेला UTR:</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>{submissionResult.upi_ref_no}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-crimson"
                  onClick={() => {
                    setSearchQuery(submissionResult.intent_ref || submissionResult.upi_ref_no);
                    setActiveTab('track');
                  }}
                  style={{ fontSize: '12.5px' }}
                >
                  <Search size={14} />
                  <span>पावती स्थिती तपासा</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setActiveIntent(null);
                    setSubmissionResult(null);
                    setUtrNumber('');
                    setDonorName('');
                    setDonorMobile('');
                  }}
                  style={{ fontSize: '12.5px' }}
                >
                  <span>दुसरी वर्गणी नोंदवा</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: TRACK STATUS ===================== */}
      {activeTab === 'track' && (
        <div className="section-card" style={{ padding: '18px 20px' }}>
          <div className="section-header-row" style={{ marginBottom: '14px' }}>
            <div className="section-title">
              <Search size={18} color="#7f1d1d" />
              <span>वर्गणी पावती व पडताळणी स्थिती तपासा</span>
            </div>
          </div>

          <form onSubmit={handleTrackStatus} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <span className="input-icon"><Search size={16} /></span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="मोबाईल नंबर / संदर्भ क्र. (INT-...) / UTR टाका"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="input-track-search"
                />
              </div>

              <button
                type="submit"
                className="btn btn-crimson"
                disabled={trackingLoading}
                style={{ padding: '0 16px', fontSize: '13px' }}
                id="btn-search-status"
              >
                <Search size={15} />
                <span>{trackingLoading ? 'शोधत आहे...' : 'शोधा'}</span>
              </button>
            </div>
          </form>

          {trackingError && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecdd3', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', fontWeight: 700 }}>
              {trackingError}
            </div>
          )}

          {trackingResult && trackingResult.contribution && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '16px', color: '#0f172a', fontWeight: 900 }}>
                    {trackingResult.contribution.donor_name}
                  </h4>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    मोबाईल: {trackingResult.contribution.donor_mobile} • नोंद: {formatTimestamp(trackingResult.contribution.created_at)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                    {formatIndianCurrency(trackingResult.contribution.amount)}
                  </div>

                  {/* Status Badge */}
                  {trackingResult.contribution.verification_status === 'VERIFIED' && (
                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                      🟢 पडताळणी पूर्ण (Verified)
                    </span>
                  )}
                  {trackingResult.contribution.verification_status === 'PENDING_VERIFICATION' && (
                    <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                      🟡 पडताळणी प्रलंबित (Pending Verification)
                    </span>
                  )}
                  {trackingResult.contribution.verification_status === 'INITIATED' && (
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                      🔵 हेतू सुरू (Initiated - UTR Pending)
                    </span>
                  )}
                  {trackingResult.contribution.verification_status === 'REJECTED' && (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecdd3', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                      🔴 अमान्य / रद्द (Rejected)
                    </span>
                  )}
                </div>
              </div>

              {/* Reference Grid */}
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>संदर्भ क्र. (Intent Ref):</span>
                  <strong style={{ fontFamily: 'monospace' }}>{trackingResult.contribution.intent_ref || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>UTR / Transaction ID:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{trackingResult.contribution.upi_ref_no || 'अद्याप नोंदवलेला नाही'}</strong>
                </div>
                {trackingResult.contribution.rejection_reason && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                    <span>कारण (Reason):</span>
                    <strong>{trackingResult.contribution.rejection_reason}</strong>
                  </div>
                )}
              </div>

              {/* Verified Receipt Action Card */}
              {trackingResult.receipt && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                        अधिकृत पावती क्रमांक
                      </span>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#14532d', fontFamily: 'monospace' }}>
                        {trackingResult.receipt.receipt_no}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-green"
                      onClick={() => onNavigate('receipts')}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <FileText size={14} />
                      <span>पावती यादीत पहा</span>
                    </button>
                  </div>
                </div>
              )}

              {trackingResult.contribution.verification_status === 'PENDING_VERIFICATION' && (
                <div style={{ fontSize: '11.5px', color: '#92400e', background: '#fffbeb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fef08a' }}>
                  मंडळाचे अध्यक्ष बँक स्टेटमेंटशी UTR पडताळून अधिकृत पावती लवकरच जारी करतील.
                </div>
              )}

              {trackingResult.contribution.verification_status === 'REJECTED' && (
                <div style={{ fontSize: '11.5px', color: '#991b1b', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                  ही नोंद अमान्य करण्यात आली आहे. आपल्या खात्यातून रक्कम कपात झाली असल्यास कृपया मंडळाशी संपर्क साधा.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

