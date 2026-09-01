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
  Download,
  MessageCircle,
  Building,
  Heart,
  ChevronRight,
  LogIn,
  MapPin,
  Calendar,
  X,
  Share2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANDAL_UPI_CONFIG, buildUpiDeepLink } from '../config/upiConfig';
import { apiRequest } from '../utils/api';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatDate, formatTimestamp } from '../utils/dateUtils';
import ReceiptCertificateModal from '../components/receipts/ReceiptCertificateModal';

const PRESET_AMOUNTS = [101, 251, 501, 1001, 2100, 5001, 11000, 21000];

const CONTRIBUTION_CATEGORIES = [
  { code: 'GANESHOTSAV_2024', name_mr: '🚩 सार्वजनिक गणेशोत्सव २०२४ वर्गणी', name_en: 'Ganeshotsav 2024 Vargani' },
  { code: 'MANDIR_DEVELOPMENT', name_mr: '🏛️ मंदिर जीर्णोद्धार व विकास निधी', name_en: 'Mandir Development & Renovation' },
  { code: 'MAHAPRASAD', name_mr: '🍲 महाप्रसाद व अन्नदान देणगी', name_en: 'Mahaprasad & Annadaan Fund' },
  { code: 'GENERAL', name_mr: '🪔 सामान्य देणगी / वर्गणी', name_en: 'General Vargani / Offering' },
  { code: 'OTHER', name_mr: '🌺 इतर विशेष संकल्प / पूजा देणगी', name_en: 'Other Special Sankalp / Puja' }
];

export default function PublicDevoteePortalView({ 
  onOpenAdminLogin, 
  onNavigateAdmin,
  onNavigatePayVargani,
  onNavigateContact
}) {
  const { t, lang, changeLanguage } = useLanguage();
  const { user } = useAuth();

  // Active section tab: 'donate' | 'receipts' | 'donors'
  const [activeTab, setActiveTab] = useState('donate');

  // Live Public Stats & Campaigns
  const [publicStats, setPublicStats] = useState({
    verified_total_collection: 0,
    verified_donors_count: 0,
    campaigns: [],
    recent_donors: []
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Donation Form State
  const [categoryCode, setCategoryCode] = useState('GANESHOTSAV_2024');
  const [donorName, setDonorName] = useState('');
  const [donorMobile, setDonorMobile] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [amount, setAmount] = useState('501');
  const [notes, setNotes] = useState('');
  const [initiating, setInitiating] = useState(false);
  const [formError, setFormError] = useState('');

  // Active UPI Intent State
  const [activeIntent, setActiveIntent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay / PhonePe');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Receipt Search State
  const [searchReceiptNo, setSearchReceiptNo] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundReceipts, setFoundReceipts] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // QR Canvas Ref
  const qrCanvasRef = useRef(null);

  // Load Public Stats
  const loadPublicStats = async () => {
    try {
      setStatsLoading(true);
      const res = await apiRequest('/public/stats');
      setPublicStats(res);
    } catch (err) {
      console.error('Failed to load public stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadPublicStats();
  }, []);

  // Check URL params for direct receipt verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyReceiptNo = params.get('verify') || params.get('receipt');
    if (verifyReceiptNo) {
      handleDirectVerifyReceipt(verifyReceiptNo);
    }
  }, []);

  // Render QR Code Canvas when an active intent exists
  useEffect(() => {
    if (!qrCanvasRef.current || !activeIntent) return;
    try {
      QRCode.toCanvas(
        qrCanvasRef.current,
        activeIntent.upi_payload,
        {
          width: 230,
          margin: 1.5,
          color: {
            dark: '#4c0519', // Sacred deep maroon
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        },
        (err) => {
          if (err) console.error('QR rendering error:', err);
        }
      );
    } catch (err) {
      console.error('QR exception:', err);
    }
  }, [activeIntent]);

  // Step 1: Initiate Real Payment Intent
  const handleInitiateDonation = async (e) => {
    e.preventDefault();
    if (!donorName.trim()) {
      setFormError(lang === 'mr' ? 'कृपया दात्याचे नाव टाका.' : 'Please enter donor name.');
      return;
    }
    const cleanMobile = donorMobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setFormError(lang === 'mr' ? 'कृपया वैध 10-अंकी व्हॉट्सअ‍ॅप मोबाईल नंबर टाका.' : 'Please enter valid 10-digit WhatsApp mobile number.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError(lang === 'mr' ? 'कृपया वैध वर्गणी रक्कम भरा.' : 'Please enter a valid donation amount.');
      return;
    }

    try {
      setInitiating(true);
      setFormError('');
      const res = await apiRequest('/public/donations', {
        method: 'POST',
        body: JSON.stringify({
          donor_name: donorName.trim(),
          donor_mobile: cleanMobile,
          address_galli: donorAddress.trim() || 'ऐरोली, नवी मुंबई',
          amount: numAmount,
          category_code: categoryCode,
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
      setFormError(err.message || 'पेमेंट हेतू तयार करताना त्रुटी आली.');
    } finally {
      setInitiating(false);
    }
  };

  // Step 2: Copy UPI ID
  const handleCopyUpiId = () => {
    const upiId = activeIntent ? activeIntent.upi_id : MANDAL_UPI_CONFIG.upiId;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Step 3: Launch Mobile UPI Deep Link
  const handlePayViaApp = () => {
    if (!activeIntent || !activeIntent.upi_link) return;
    window.location.href = activeIntent.upi_link;
  };

  // Step 4: Submit 12-Digit UTR
  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 4) {
      setFormError(lang === 'mr' ? 'कृपया बँक/UPI ॲप मधील १२-अंकी UTR किंवा Transaction ID टाका.' : 'Please enter the 12-digit UTR from your bank app.');
      return;
    }

    try {
      setSubmittingUtr(true);
      setFormError('');
      const res = await apiRequest('/public/payments/utr', {
        method: 'POST',
        body: JSON.stringify({
          intent_id: activeIntent ? activeIntent.id : null,
          intent_ref: activeIntent ? activeIntent.intent_ref : null,
          upi_ref_no: cleanUtr,
          payment_app: paymentApp,
          notes: notes.trim()
        })
      });

      setSubmissionResult(res.contribution);
    } catch (err) {
      setFormError(err.message || 'UTR नोंद सबमिट करताना त्रुटी आली.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  // Reset donation flow
  const handleResetFlow = () => {
    setActiveIntent(null);
    setSubmissionResult(null);
    setUtrNumber('');
    setFormError('');
  };

  // Search Public Receipts
  const handleSearchReceipts = async (e) => {
    if (e) e.preventDefault();
    if (!searchReceiptNo.trim() && !searchMobile.trim()) {
      setSearchError(lang === 'mr' ? 'कृपया पावती क्रमांक किंवा मोबाईल नंबर टाका.' : 'Please enter receipt number or mobile number.');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError('');
      setFoundReceipts([]);
      const params = new URLSearchParams();
      if (searchReceiptNo.trim()) params.append('receipt_no', searchReceiptNo.trim());
      if (searchMobile.trim()) params.append('mobile', searchMobile.trim());

      const res = await apiRequest(`/public/receipts/search?${params.toString()}`);
      if (res.receipts && res.receipts.length > 0) {
        setFoundReceipts(res.receipts);
      } else {
        setSearchError(lang === 'mr' ? 'कोणतीही पडताळलेली पावती आढळली नाही.' : 'No verified receipt found.');
      }
    } catch (err) {
      setSearchError(err.message || (lang === 'mr' ? 'पावती शोधताना त्रुटी आली.' : 'Failed to find receipt.'));
    } finally {
      setSearchLoading(false);
    }
  };

  // Direct Verify Receipt
  const handleDirectVerifyReceipt = async (receiptNo) => {
    try {
      const res = await apiRequest(`/public/receipts/${encodeURIComponent(receiptNo)}/verify`);
      if (res.verified && res.receipt) {
        setSelectedReceipt(res.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Direct receipt verify error:', err);
    }
  };

  return (
    <div className="public-portal-container">

      {/* Admin Floating Banner if logged in */}
      {user && (
        <div className="admin-status-banner">
          <div className="admin-status-content">
            <span className="admin-status-badge">👑 {user.name_mr || user.name} ({user.role})</span>
            <span>{lang === 'mr' ? 'आपण व्यवस्थापक म्हणून कनेक्ट आहात.' : 'Logged in as Temple Administrator.'}</span>
            <button className="btn-admin-return-link" onClick={onNavigateAdmin}>
              {lang === 'mr' ? 'व्यवस्थापन पॅनेलवर परत जा' : 'Return to Admin Panel'} &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 2. Hero Section: Sacred Temple Banner */}
      <section className="public-hero-section">
        <div className="hero-sacred-badge">
          <Sparkles size={14} color="#f59e0b" />
          <span>{lang === 'mr' ? '॥ श्री गणेशाय नमः ॥ अधिकृत वर्गणी व देणगी पोर्टल' : '॥ Shree Ganeshaya Namah ॥ Official Donation Portal'}</span>
        </div>

        <div className="hero-temple-intro">
          <div className="hero-deities-wrap">
            <div className="hero-deity-card-item">
              <img src="/assets/ganesha_logo.png" alt="श्री सिद्धिविनायक" className="hero-deity-avatar" />
              <span className="hero-deity-title-tag">{lang === 'mr' ? '॥ श्री सिद्धिविनायक ॥' : 'Shree Siddhivinayak'}</span>
            </div>
            <div className="hero-deity-card-item">
              <img src="/assets/shivaji_portrait.png" alt="छत्रपती शिवाजी महाराज" className="hero-deity-avatar shivaji" />
              <span className="hero-deity-title-tag">{lang === 'mr' ? '॥ छ. शिवाजी महाराज ॥' : 'Chh. Shivaji Maharaj'}</span>
            </div>
          </div>

          <h1 className="hero-temple-heading">
            {t('mandalName')}
          </h1>
          <p className="hero-temple-location">
            🚩 {t('mandalLocation')} • {t('regNo')}
          </p>

          <p className="hero-temple-blessing">
            {t('blessing')}
          </p>
        </div>

        {/* Live Temple Highlights & Timings */}
        <div className="temple-timings-grid">
          <div className="timing-card">
            <div className="timing-icon">🪔</div>
            <div>
              <div className="timing-title">{lang === 'mr' ? 'दर्शन वेळ' : 'Darshan Timings'}</div>
              <div className="timing-time">6:00 AM – 10:00 PM</div>
            </div>
          </div>
          <div className="timing-card">
            <div className="timing-icon">🔔</div>
            <div>
              <div className="timing-title">{lang === 'mr' ? 'दैनिक महाआरती' : 'Daily Maha Aarti'}</div>
              <div className="timing-time">7:30 AM & 8:00 PM</div>
            </div>
          </div>
          <div className="timing-card">
            <div className="timing-icon">🛡️</div>
            <div>
              <div className="timing-title">{lang === 'mr' ? '१००% पारदर्शक' : '100% Transparent'}</div>
              <div className="timing-time">{lang === 'mr' ? 'बँक पडताळणी पावती' : 'Verified e-Receipts'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Transparency Stats Banner */}
      <section className="public-transparency-stats">
        <div className="transparency-card-main">
          <div className="transparency-left">
            <div className="transparency-sub">
              {lang === 'mr' ? 'एकूण जमा पडताळलेली वर्गणी (Verified Funds)' : 'Total Verified Temple Collection'}
            </div>
            <div className="transparency-amount">
              {formatIndianCurrency(publicStats.verified_total_collection)}
            </div>
            <div className="transparency-footer-note">
              <ShieldCheck size={14} color="#15803d" />
              <span>
                {lang === 'mr'
                  ? `एकूण ${publicStats.verified_donors_count} भक्तांकडून अधिकृत देणग्या प्राप्त`
                  : `${publicStats.verified_donors_count} verified devotee offerings received`}
              </span>
            </div>
          </div>

          <div className="transparency-right">
            <button className="btn-hero-donate-now" onClick={() => setActiveTab('donate')}>
              <Heart size={16} fill="#ffffff" />
              <span>{lang === 'mr' ? 'वर्गणी अर्पण करा 🙏' : 'Make Offering 🙏'}</span>
            </button>
            <button className="btn-hero-search-receipt" onClick={() => setActiveTab('receipts')}>
              <Search size={15} />
              <span>{lang === 'mr' ? 'माझी पावती शोधा' : 'Find My Receipt'}</span>
            </button>
          </div>
        </div>

        {/* Active Campaigns Progress */}
        {publicStats.campaigns && publicStats.campaigns.length > 0 && (
          <div className="campaigns-list-grid">
            {publicStats.campaigns.map((cmp) => {
              const target = cmp.target_amount || 500000;
              const collected = cmp.collected_amount || 0;
              const pct = Math.min(100, Math.round((collected / target) * 100));

              return (
                <div key={cmp.id} className="campaign-badge-card">
                  <div className="campaign-badge-header">
                    <strong>{lang === 'mr' ? cmp.name_mr : cmp.name_en}</strong>
                    <span className="campaign-pct-tag">{pct}%</span>
                  </div>
                  <div className="campaign-progress-bar">
                    <div className="campaign-progress-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="campaign-amounts-row">
                    <span>{formatIndianCurrency(collected)} {lang === 'mr' ? 'जमा' : 'raised'}</span>
                    <span>{lang === 'mr' ? 'उद्दिष्ट' : 'Target'}: {formatIndianCurrency(target)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Navigation Tabs for Devotees */}
      <div className="public-nav-tabs">
        <button
          className={`public-tab-btn ${activeTab === 'donate' ? 'active' : ''}`}
          onClick={() => setActiveTab('donate')}
        >
          <QrCode size={18} />
          <span>{lang === 'mr' ? 'वर्गणी / देणगी अर्पण करा' : 'Pay Vargani (UPI)'}</span>
        </button>

        <button
          className={`public-tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipts')}
        >
          <FileText size={18} />
          <span>{lang === 'mr' ? 'माझी पावती शोधा' : 'Find My Receipt'}</span>
        </button>

        <button
          className={`public-tab-btn ${activeTab === 'donors' ? 'active' : ''}`}
          onClick={() => setActiveTab('donors')}
        >
          <Heart size={18} />
          <span>{lang === 'mr' ? 'भक्त देणगीदार यादी' : 'Devotee Honor Roll'}</span>
        </button>
      </div>

      {/* 5. TAB 1: Make a Contribution (UPI QR Flow) */}
      {activeTab === 'donate' && (
        <section className="public-tab-content">
          {!activeIntent ? (
            /* STEP 1: Devotee & Amount Form */
            <div className="public-donation-form-card">
              <div className="form-sacred-header">
                <div className="form-sacred-title">
                  🚩 {lang === 'mr' ? 'ऑनलाइन वर्गणी / देणगी अर्पण करा' : 'Offer Online Vargani / Donation'}
                </div>
                <div className="form-sacred-sub">
                  {lang === 'mr'
                    ? 'थेट अधिकृत UPI द्वारे श्री सिद्धिविनायकाच्या चरणी सेवा अर्पण करा'
                    : 'Directly offer donation via official UPI to Shree Siddhivinayak Mandir'}
                </div>
              </div>

              {formError && (
                <div className="public-error-banner">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleInitiateDonation} className="public-form">
                {/* Category Selection */}
                <div className="form-group">
                  <label className="form-label">
                    {lang === 'mr' ? '* देणगी / वर्गणी प्रकार (CATEGORY):' : '* CONTRIBUTION CATEGORY:'}
                  </label>
                  <select
                    className="form-select"
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                  >
                    {CONTRIBUTION_CATEGORIES.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {lang === 'mr' ? cat.name_mr : cat.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preset Amount Pills */}
                <div className="form-group">
                  <label className="form-label">
                    {lang === 'mr' ? '* देणगी रक्कम निवडा (₹ AMOUNT):' : '* SELECT OFFERING AMOUNT (₹):'}
                  </label>
                  <div className="preset-amounts-grid">
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`preset-pill ${amount === amt.toString() ? 'active' : ''}`}
                        onClick={() => setAmount(amt.toString())}
                      >
                        ₹ {amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>

                  <div className="custom-amount-input-wrap">
                    <span className="currency-prefix">₹</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input custom-amt"
                      placeholder={lang === 'mr' ? 'किंवा इतर रक्कम टाका...' : 'Or enter custom amount...'}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Donor Name & WhatsApp */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'mr' ? '* दात्याचे नाव (DONOR NAME):' : '* DONOR FULL NAME:'}
                    </label>
                    <div className="input-with-icon">
                      <User size={16} className="input-icon" />
                      <input
                        type="text"
                        className="form-input"
                        placeholder={lang === 'mr' ? 'उदा. आनंद पाटील' : 'e.g. Anand Patil'}
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'mr' ? '* व्हॉट्सअ‍ॅप मोबाईल (WHATSAPP NO):' : '* WHATSAPP MOBILE NO:'}
                    </label>
                    <div className="input-with-icon">
                      <Phone size={16} className="input-icon" />
                      <input
                        type="tel"
                        maxLength="10"
                        className="form-input"
                        placeholder={lang === 'mr' ? 'उदा. 9822001122' : 'e.g. 9822001122'}
                        value={donorMobile}
                        onChange={(e) => setDonorMobile(e.target.value)}
                        required
                      />
                    </div>
                    <span className="form-help-text">
                      {lang === 'mr' ? 'या नंबरवर अधिकृत ई-पावती पाठवली जाईल.' : 'Official e-Receipt will be sent to this WhatsApp.'}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label">
                    {lang === 'mr' ? 'पत्ता / गल्ली (ADDRESS):' : 'ADDRESS / LOCALITY:'}
                  </label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'उदा. ऐरोली सेक्टर-५, नवी मुंबई' : 'e.g. Airoli Sector-5, Navi Mumbai'}
                      value={donorAddress}
                      onChange={(e) => setDonorAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  className="btn-generate-upi-qr"
                  disabled={initiating}
                >
                  <QrCode size={20} />
                  <span>
                    {initiating
                      ? (lang === 'mr' ? 'QR तयार होत आहे...' : 'Generating QR...')
                      : (lang === 'mr' ? `₹ ${parseFloat(amount || 0).toLocaleString('en-IN')} साठी UPI QR जनरेट करा` : `Generate QR for ₹ ${parseFloat(amount || 0).toLocaleString('en-IN')}`)}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            /* STEP 2 & 3: Dynamic QR Code & 12-Digit UTR Submission */
            <div className="public-donation-qr-card">
              {!submissionResult ? (
                <>
                  <div className="qr-card-header">
                    <button className="btn-back-link" onClick={handleResetFlow}>
                      &larr; {lang === 'mr' ? 'मागे जा / रक्कम बदला' : 'Back / Change Amount'}
                    </button>
                    <div className="qr-intent-badge">
                      <span>{activeIntent.intent_ref}</span>
                    </div>
                  </div>

                  <div className="qr-presentation-grid">
                    {/* QR Code Presentation */}
                    <div className="qr-canvas-box">
                      <div className="qr-amount-banner">
                        ₹ {Number(activeIntent.amount).toLocaleString('en-IN')}
                      </div>
                      <canvas ref={qrCanvasRef} className="qr-canvas-element" />
                      
                      <div className="qr-beneficiary-tag">
                        <strong>{MANDAL_UPI_CONFIG.payeeName}</strong>
                        <span>{MANDAL_UPI_CONFIG.upiId}</span>
                      </div>

                      {/* 1-Click Actions */}
                      <div className="qr-actions-row">
                        <button className="btn-copy-upi" onClick={handleCopyUpiId}>
                          {copied ? <Check size={16} color="#15803d" /> : <Copy size={16} />}
                          <span>{copied ? (lang === 'mr' ? 'कॉपी झाले!' : 'Copied!') : (lang === 'mr' ? 'UPI ID कॉपी करा' : 'Copy UPI ID')}</span>
                        </button>

                        <button className="btn-direct-pay-app" onClick={handlePayViaApp}>
                          <ExternalLink size={16} />
                          <span>{lang === 'mr' ? 'थेट UPI ॲप उघडा' : 'Open in GPay / PhonePe'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 3: UTR Submission Form */}
                    <div className="utr-submission-box">
                      <div className="utr-box-header">
                        <div className="step-badge">STEP 2</div>
                        <h3>{lang === 'mr' ? 'पेमेंट पूर्ण झाल्यावर UTR नंबर टाका' : 'Submit 12-Digit UTR after payment'}</h3>
                        <p>
                          {lang === 'mr'
                            ? 'कोणत्याही UPI ॲपवरून (GPay, PhonePe, Paytm, BHIM) पेमेंट केल्यानंतर मिळणारा १२-अंकी UTR क्रमांक खाली नोंदवा.'
                            : 'Enter the 12-digit UTR from your payment app after completing payment.'}
                        </p>
                      </div>

                      {formError && (
                        <div className="public-error-banner small">
                          <AlertCircle size={16} />
                          <span>{formError}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitUtr} className="utr-form">
                        <div className="form-group">
                          <label className="form-label">
                            {lang === 'mr' ? '* १२-अंकी UPI Transaction ID / UTR क्रमांक:' : '* 12-DIGIT UTR / TRANSACTION ID:'}
                          </label>
                          <div className="input-with-icon">
                            <Hash size={16} className="input-icon" />
                            <input
                              type="text"
                              maxLength="25"
                              className="form-input utr-input"
                              placeholder="उदा. 423456789012"
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {lang === 'mr' ? 'वापरलेले पेमेंट ॲप:' : 'PAYMENT APP USED:'}
                          </label>
                          <select
                            className="form-select"
                            value={paymentApp}
                            onChange={(e) => setPaymentApp(e.target.value)}
                          >
                            <option value="Google Pay">Google Pay (GPay)</option>
                            <option value="PhonePe">PhonePe</option>
                            <option value="Paytm">Paytm</option>
                            <option value="BHIM UPI">BHIM UPI</option>
                            <option value="Cred / Bank App">Cred / NetBanking</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="btn-submit-utr-confirm"
                          disabled={submittingUtr}
                        >
                          <CheckCircle2 size={18} />
                          <span>
                            {submittingUtr
                              ? (lang === 'mr' ? 'नोंद पाठवत आहे...' : 'Submitting...')
                              : (lang === 'mr' ? '✓ वर्गणी नोंद सबमिट करा' : '✓ Submit Payment Reference')}
                          </span>
                        </button>
                      </form>

                      <div className="security-notice-callout">
                        <ShieldCheck size={16} color="#b45309" />
                        <span>
                          {lang === 'mr'
                            ? 'आपली वर्गणी नोंद मंदिर व्यवस्थापकांकडे बँक खात्याशी पडताळणीसाठी पाठवली जाईल. पडताळणी पूर्ण होताच अधिकृत पावती मिळेल.'
                            : 'Your payment will be verified against the temple bank statement before official receipt issuance.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* STEP 4: Success / Pending Verification Status Screen */
                <div className="submission-success-card">
                  <div className="status-icon-wrap pending">
                    <Clock size={36} color="#d97706" />
                  </div>

                  <h2>{lang === 'mr' ? 'वर्गणी नोंद यशस्वीरित्या प्राप्त!' : 'Offering Submitted Successfully!'}</h2>
                  <p className="status-tag-pending">
                    🟡 {lang === 'mr' ? 'स्थिती: बँक पडताळणी प्रलंबित (Pending Verification)' : 'Status: Pending Bank Verification'}
                  </p>

                  <div className="submission-details-table">
                    <div className="detail-row">
                      <span>{lang === 'mr' ? 'संदर्भ क्रमांक (Reference):' : 'Intent Reference:'}</span>
                      <strong>{submissionResult.intent_ref}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{lang === 'mr' ? 'दाता नाव (Donor):' : 'Donor Name:'}</span>
                      <strong>{submissionResult.donor_name}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{lang === 'mr' ? 'वर्गणी रक्कम (Amount):' : 'Amount:'}</span>
                      <strong>₹ {Number(submissionResult.amount).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="detail-row">
                      <span>{lang === 'mr' ? 'सादर केलेला UTR:' : 'Submitted UTR:'}</span>
                      <strong>{submissionResult.upi_ref_no}</strong>
                    </div>
                  </div>

                  <p className="submission-next-steps">
                    {lang === 'mr'
                      ? 'आपला UTR क्रमांक सुरक्षित ठेवा. मंदिर कोषाध्यक्षांकडून बँक खात्याशी पडताळणी झाल्यानंतर आपली अधिकृत पावती "माझी पावती शोधा" टॅबमध्ये उपलब्ध होईल.'
                      : 'Please save your reference. Once verified against temple bank records, your official receipt will be available in "Find My Receipt".'}
                  </p>

                  <div className="submission-actions">
                    <button className="btn-secondary" onClick={handleResetFlow}>
                      {lang === 'mr' ? 'नवीन देणगी अर्पण करा' : 'Make Another Offering'}
                    </button>
                    <button className="btn-primary" onClick={() => setActiveTab('receipts')}>
                      {lang === 'mr' ? 'माझी पावती शोधा टॅब पहा' : 'Check Receipt Status'} &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 6. TAB 2: Find My Official e-Receipt */}
      {activeTab === 'receipts' && (
        <section className="public-tab-content">
          <div className="receipt-search-card">
            <div className="form-sacred-header">
              <div className="form-sacred-title">
                🔍 {lang === 'mr' ? 'अधिकृत ई-पावती शोधा व डाउनलोड करा' : 'Find & Download Official e-Receipt'}
              </div>
              <div className="form-sacred-sub">
                {lang === 'mr'
                  ? 'आपला मोबाईल नंबर किंवा पावती क्रमांक टाकून अधिकृत पावती PDF डाउनलोड करा किंवा व्हॉट्सअ‍ॅपवर पाठवा.'
                  : 'Enter your registered mobile number or receipt number to view and download your certificate.'}
              </div>
            </div>

            {searchError && (
              <div className="public-error-banner">
                <AlertCircle size={18} />
                <span>{searchError}</span>
              </div>
            )}

            <form onSubmit={handleSearchReceipts} className="receipt-search-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    {lang === 'mr' ? 'व्हॉट्सअ‍ॅप मोबाईल नंबर:' : 'WHATSAPP MOBILE NUMBER:'}
                  </label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder={lang === 'mr' ? 'उदा. 9822001122' : 'e.g. 9822001122'}
                      value={searchMobile}
                      onChange={(e) => setSearchMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {lang === 'mr' ? 'किंवा पावती क्रमांक (RECEIPT NO):' : 'OR RECEIPT NUMBER:'}
                  </label>
                  <div className="input-with-icon">
                    <Hash size={16} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. EMM-2024-0001"
                      value={searchReceiptNo}
                      onChange={(e) => setSearchReceiptNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-search-receipts-submit"
                disabled={searchLoading}
              >
                <Search size={18} />
                <span>{searchLoading ? (lang === 'mr' ? 'शोधत आहे...' : 'Searching...') : (lang === 'mr' ? 'पावती शोधा' : 'Search Receipts')}</span>
              </button>
            </form>

            {/* Results Grid */}
            {foundReceipts.length > 0 && (
              <div className="found-receipts-list">
                <div className="found-results-title">
                  {lang === 'mr' ? `एकूण ${foundReceipts.length} अधिकृत पावत्या आढळल्या:` : `Found ${foundReceipts.length} verified receipts:`}
                </div>

                <div className="receipts-cards-grid">
                  {foundReceipts.map((r) => (
                    <div key={r.id} className="public-receipt-card">
                      <div className="rc-header">
                        <span className="rc-no">{r.receipt_no}</span>
                        <span className="rc-status-paid">✓ {lang === 'mr' ? 'जमा (PAID)' : 'VERIFIED'}</span>
                      </div>

                      <div className="rc-body">
                        <div className="rc-donor-name">{r.donor_name}</div>
                        <div className="rc-meta">
                          <span>{formatDate(r.issue_date)}</span>
                          <span>•</span>
                          <span>{r.payment_mode}</span>
                        </div>
                        <div className="rc-amount">
                          {formatIndianCurrency(r.amount)}
                        </div>
                      </div>

                      <div className="rc-actions">
                        <button
                          className="btn-rc-view"
                          onClick={() => {
                            setSelectedReceipt(r);
                            setIsReceiptModalOpen(true);
                          }}
                        >
                          <FileText size={15} />
                          <span>{lang === 'mr' ? 'पावती पहा व PDF डाउनलोड' : 'View & Download'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7. TAB 3: Devotee Honor Roll (भक्त देणगीदार यादी) */}
      {activeTab === 'donors' && (
        <section className="public-tab-content">
          <div className="honor-roll-card">
            <div className="form-sacred-header">
              <div className="form-sacred-title">
                🙏 {lang === 'mr' ? 'श्री सिद्धिविनायक भक्त देणगीदार यादी' : 'Verified Devotee Honor Roll'}
              </div>
              <div className="form-sacred-sub">
                {lang === 'mr'
                  ? 'पारदर्शकता: केवळ बँक पडताळणी झालेल्या अधिकृत वर्गण्या या ठिकाणी प्रदर्शित केल्या जातात.'
                  : 'Transparency: Only bank-verified contributions are published on this honor roll.'}
              </div>
            </div>

            {publicStats.recent_donors && publicStats.recent_donors.length > 0 ? (
              <div className="honor-roll-table-wrap">
                <table className="honor-roll-table">
                  <thead>
                    <tr>
                      <th>{lang === 'mr' ? 'पावती क्र.' : 'Receipt No.'}</th>
                      <th>{lang === 'mr' ? 'भक्त / दात्याचे नाव' : 'Devotee / Donor'}</th>
                      <th>{lang === 'mr' ? 'दिनांक' : 'Date'}</th>
                      <th>{lang === 'mr' ? 'मोड' : 'Mode'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'mr' ? 'वर्गणी रक्कम' : 'Offering Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publicStats.recent_donors.map((donor, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="honor-receipt-tag">{donor.receipt_no}</span>
                        </td>
                        <td>
                          <div className="honor-donor-name">
                            <strong>{donor.donor_name}</strong>
                            {donor.masked_mobile && <span className="honor-masked-mob">{donor.masked_mobile}</span>}
                          </div>
                        </td>
                        <td className="honor-date-col">
                          {formatDate(donor.issue_date)}
                        </td>
                        <td>
                          <span className="honor-mode-tag">{donor.payment_mode}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong className="honor-amt-val">{formatIndianCurrency(donor.amount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-honor-roll">
                <div className="empty-icon">🪔</div>
                <h3>{lang === 'mr' ? 'अद्याप कोणतीही पडताळलेली वर्गणी नाही.' : 'No verified donations yet.'}</h3>
                <p>
                  {lang === 'mr'
                    ? 'वर्गणी प्राप्त झाल्यावर व बँक पडताळणी पूर्ण झाल्यावर भक्तांची नावे या ठिकाणी प्रदर्शित होतील.'
                    : 'Once verified donations are received, they will appear here.'}
                </p>
                <button className="btn-hero-donate-now" onClick={() => setActiveTab('donate')} style={{ marginTop: '14px' }}>
                  {lang === 'mr' ? 'पहिली देणगी अर्पण करा 🙏' : 'Make the First Offering 🙏'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. Official Receipt Certificate Modal */}
      {selectedReceipt && (
        <ReceiptCertificateModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedReceipt(null);
          }}
          receipt={selectedReceipt}
        />
      )}
    </div>
  );
}
