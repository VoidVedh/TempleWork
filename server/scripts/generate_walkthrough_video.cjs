/**
 * generate_walkthrough_video.js
 * 
 * Generates the official 9-scene 75-second tutorial walkthrough video artifact (tutorial_walkthrough.mp4)
 * for श्री सिद्धिविनायक मंदिर (GaneshTemple / TempleWork).
 * 
 * Features:
 * - 9 Full HD (1920x1080) visual scene slides capturing the end-to-end devotee and admin flow
 * - Aarti Timings: Morning 8:00 AM & Evening 8:00 PM
 * - Registration: MH/08/2026 (महा/०८/२०२६)
 * - Safe Admin Verification: zero secrets / credentials exposed
 * - Trilingual Receipt: Marathi, Hindi, English with authentic Devanagari styling
 * - Ambient temple bell & chime synthesized soundtrack
 * - Output: docs/video/tutorial_walkthrough.mp4
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../../docs/video');
const FRAMES_DIR = '/tmp/temple_video_frames';
const ARTIFACT_DIR = '/Users/ved/.gemini/antigravity-ide/brain/ca3e0461-d982-441e-bea7-98033ee00bd7';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

// Convert asset images to base64 for embedding in self-contained slides
const logoPath = path.join(__dirname, '../../client/public/assets/ganesha_logo.png');
const sealPath = path.join(__dirname, '../../client/public/assets/mandal_seal.svg');
const logoBase64 = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : '';
const sealBase64 = fs.existsSync(sealPath) ? `data:image/svg+xml;base64,${fs.readFileSync(sealPath).toString('base64')}` : '';

const scenes = [
  {
    num: 1,
    id: 'scene_01',
    title: 'श्री सिद्धिविनायक मंदिर — Digital Devotee Portal',
    subtitle: 'Scene 1: Mandir Homepage & Sacred Aarti Schedule',
    narration: 'Welcome to Shree Siddhivinayak Mandir portal. In this quick walkthrough, we demonstrate our transparent devotee donation and verification process.',
    contentHtml: `
      <div class="hero-grid">
        <div class="hero-brand">
          <div class="brand-badge">🚩 अधिकृत देवस्थान पोर्टल • Registration: MH/08/2026</div>
          <h1 class="hero-title">श्री सिद्धिविनायक मंदिर<br><span class="hero-en">Shree Siddhivinayak Mandir Trust</span></h1>
          <p class="hero-tagline">॥ गणपती बाप्पा मोरया • मंगलमूर्ती मोरया ॥</p>
          <div class="schedule-card">
            <div class="schedule-header">
              <span class="bell-icon">🔔</span> <strong>दैनिक दर्शन व आरती वेळापत्रक (Daily Temple Schedule)</strong>
            </div>
            <div class="schedule-rows">
              <div class="sched-item">
                <span class="sched-label">दर्शन वेळ (Darshan Hours):</span>
                <span class="sched-val">सकाळी ०६:०० ते रात्री १०:०० (6:00 AM – 10:00 PM)</span>
              </div>
              <div class="sched-item highlight">
                <span class="sched-label">🌅 सकाळची आरती (Morning Aarti):</span>
                <span class="sched-val gold">सकाळी ०८:०० वा. (8:00 AM)</span>
              </div>
              <div class="sched-item highlight">
                <span class="sched-label">🌇 संध्याकाळची आरती (Evening Aarti):</span>
                <span class="sched-val gold">रात्री ०८:०० वा. (8:00 PM)</span>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-box">
            <div class="stat-num">₹१,२४,५००</div>
            <div class="stat-label">एकूण संकलित वर्गणी (Total Seva)</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">३५४+</div>
            <div class="stat-label">सत्यापित भाविक (Verified Devotees)</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">१००%</div>
            <div class="stat-label">पारदर्शक डिजिटल हिशोब (Transparent Ledger)</div>
          </div>
          <div class="action-preview">
            <button class="btn-primary">🙏 वर्गणी / देणगी द्या (Pay Vargani)</button>
            <button class="btn-secondary">📜 पावती शोधा (Search Receipt)</button>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 2,
    id: 'scene_02',
    title: 'भाविक वर्गणी नोंदणी (Devotee Seva Registration)',
    subtitle: 'Scene 2: Contribution Form & Seva Selection',
    narration: 'Devotees enter their basic details, select their seva sankalp, and enter their desired contribution amount.',
    contentHtml: `
      <div class="form-container">
        <div class="form-card">
          <div class="form-header">
            <div class="step-indicator">पायरी १ / STEP 1: भाविक तपशील (Devotee Details)</div>
            <h2>वर्गणी / देणगी नोंदणी फॉर्म</h2>
          </div>
          <div class="form-grid">
            <div class="input-group">
              <label>भाविकाचे पूर्ण नाव (Full Name)</label>
              <input type="text" value="Rahul Sharma (राहुल शर्मा)" readonly class="filled-input">
            </div>
            <div class="input-group">
              <label>मोबाईल क्रमांक (Mobile Number)</label>
              <input type="text" value="9820098200" readonly class="filled-input">
            </div>
            <div class="input-group">
              <label>सेवा उत्सव श्रेणी (Seva Category)</label>
              <input type="text" value="गणेश जयंती उत्सव २०२६ (Ganesh Jayanti 2026)" readonly class="filled-input">
            </div>
            <div class="input-group">
              <label>वर्गणी रक्कम (Amount in ₹)</label>
              <div class="amount-field">
                <span class="currency-symbol">₹</span>
                <input type="text" value="501.00" readonly class="filled-input amount-val">
              </div>
            </div>
            <div class="input-group full-width">
              <label>संकल्प / सदिच्छा (Devotional Message)</label>
              <input type="text" value="सद्बुद्धी, आरोग्य आणि सुख समृद्धी लाभो • सप्रेम भेट" readonly class="filled-input">
            </div>
          </div>
          <div class="form-footer">
            <div class="note">🔒 सुरक्षित व्यवहार • सर्व नोंदी डिजिटल बहीखात्यात तात्काळ सुरक्षित होतात</div>
            <button class="btn-primary pulse-btn">पुढे जा — UPI द्वारे सुरक्षित देणगी द्या (Proceed to UPI) ➔</button>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 3,
    id: 'scene_03',
    title: 'सुरक्षित UPI पेमेंट (Secure UPI Payment Intent)',
    subtitle: 'Scene 3: Dynamic UPI QR Code & Intent Generation',
    narration: 'A secure intent reference is generated. The devotee completes the transfer using Google Pay, PhonePe, Paytm, or any UPI app.',
    contentHtml: `
      <div class="upi-modal-layout">
        <div class="upi-card">
          <div class="upi-header">
            <span class="secure-badge">🔒 256-BIT ENCRYPTED UPI GATEWAY</span>
            <h3>UPI द्वारे स्कॅन करून भरा (Scan & Pay)</h3>
            <div class="intent-pill">Intent Ref: <strong>INT-2026-0842</strong></div>
          </div>
          <div class="upi-body">
            <div class="qr-col">
              <div class="qr-box">
                <!-- SVG QR Visual -->
                <svg width="220" height="220" viewBox="0 0 100 100" class="qr-svg">
                  <rect width="100" height="100" fill="#ffffff" rx="4"/>
                  <!-- Position Markers -->
                  <rect x="6" y="6" width="26" height="26" fill="#1e293b" rx="2"/>
                  <rect x="10" y="10" width="18" height="18" fill="#ffffff"/>
                  <rect x="13" y="13" width="12" height="12" fill="#d97706"/>
                  
                  <rect x="68" y="6" width="26" height="26" fill="#1e293b" rx="2"/>
                  <rect x="72" y="10" width="18" height="18" fill="#ffffff"/>
                  <rect x="75" y="13" width="12" height="12" fill="#d97706"/>

                  <rect x="6" y="68" width="26" height="26" fill="#1e293b" rx="2"/>
                  <rect x="10" y="72" width="18" height="18" fill="#ffffff"/>
                  <rect x="13" y="75" width="12" height="12" fill="#d97706"/>

                  <!-- Data modules pattern -->
                  <rect x="36" y="12" width="6" height="6" fill="#1e293b"/>
                  <rect x="46" y="8" width="8" height="6" fill="#1e293b"/>
                  <rect x="38" y="24" width="12" height="6" fill="#1e293b"/>
                  <rect x="12" y="38" width="6" height="12" fill="#1e293b"/>
                  <rect x="24" y="44" width="8" height="8" fill="#1e293b"/>
                  <rect x="38" y="38" width="24" height="24" fill="#d97706" rx="3"/>
                  <text x="50" y="54" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">ॐ</text>
                  <rect x="68" y="38" width="8" height="10" fill="#1e293b"/>
                  <rect x="80" y="46" width="12" height="6" fill="#1e293b"/>
                  <rect x="38" y="68" width="8" height="14" fill="#1e293b"/>
                  <rect x="52" y="76" width="16" height="8" fill="#1e293b"/>
                  <rect x="74" y="68" width="18" height="18" fill="#1e293b"/>
                </svg>
                <div class="qr-label">स्कॅन करा (Scan with any UPI App)</div>
              </div>
            </div>
            <div class="upi-details-col">
              <div class="pay-amount-box">
                <div class="pay-lbl">एकूण देय रक्कम (Payable Amount):</div>
                <div class="pay-val">₹५०१.०० <span class="inr">(₹501.00)</span></div>
              </div>
              <div class="detail-row">
                <span>स्वीकारकर्ता (Payee):</span>
                <strong>श्री सिद्धिविनायक मंदिर ट्रस्ट</strong>
              </div>
              <div class="detail-row">
                <span>अधिकृत UPI ID:</span>
                <code>siddhivinayak.mandir@upi</code>
              </div>
              <div class="detail-row">
                <span>नोंदणी क्र. (Reg. No):</span>
                <strong>MH/08/2026</strong>
              </div>
              <div class="supported-apps">
                <span class="app-tag">Google Pay</span>
                <span class="app-tag">PhonePe</span>
                <span class="app-tag">Paytm</span>
                <span class="app-tag">BHIM UPI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 4,
    id: 'scene_04',
    title: '१२-अंकी UTR संदर्भ क्रमांक नोंदणी (UTR Submission)',
    subtitle: 'Scene 4: UTR / Bank Transaction Reference Entry',
    narration: 'Once the transfer is done, the devotee enters their 12-digit UTR transaction reference number.',
    contentHtml: `
      <div class="form-container">
        <div class="form-card highlight-card">
          <div class="form-header">
            <div class="step-indicator">पायरी २ / STEP 2: बँक संदर्भ पडताळणी (Bank Reference)</div>
            <h2>व्यवहार पूर्ण झाला? UTR नंबर येथे टाका</h2>
            <p class="sub-lead">कृपया आपल्या UPI अ‍ॅपमधील १२-अंकी UTR / Bank Reference Number प्रविष्ट करा</p>
          </div>
          <div class="utr-input-box">
            <label class="utr-label">१२-अंकी UTR नंबर (12-Digit UPI Transaction ID):</label>
            <div class="utr-display-row">
              <input type="text" value="429810384912" readonly class="utr-input">
              <div class="check-valid">✓ वैध स्वरूप (Valid 12 Digits)</div>
            </div>
            <div class="utr-hints">
              <span>उदा. Google Pay: UPI Transaction ID</span> • 
              <span>PhonePe: UTR</span> • 
              <span>Paytm: Ref No.</span>
            </div>
          </div>
          <div class="summary-chip-row">
            <div class="chip">भाविक: <strong>Rahul Sharma</strong></div>
            <div class="chip">मोबाईल: <strong>9820098200</strong></div>
            <div class="chip">रक्कम: <strong>₹501.00</strong></div>
            <div class="chip">रेफरन्स: <strong>INT-2026-0842</strong></div>
          </div>
          <div class="form-footer">
            <button class="btn-primary success-btn pulse-btn">पडताळणीसाठी सबमिट करा (Submit for Verification) ✓</button>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 5,
    id: 'scene_05',
    title: 'पडताळणी प्रलंबित पुष्टी (Verification Pending State)',
    subtitle: 'Scene 5: Contribution Logged & Pending Confirmation',
    narration: 'The contribution is instantly logged as Pending Verification until mandal trustees review the transaction.',
    contentHtml: `
      <div class="pending-container">
        <div class="pending-card">
          <div class="pending-icon-circle">⏳</div>
          <div class="status-badge-pending">पडताळणी प्रलंबित • PENDING VERIFICATION</div>
          <h2>आपली देणगी यशस्वीपणे नोंदवली गेली आहे!</h2>
          <p class="pending-msg">श्री सिद्धिविनायक मंदिर ट्रस्ट आपल्या योगदानाबद्दल कृतज्ञ आहे. मंदिर व्यवस्थापक बँकेच्या खात्याशी पडताळणी करून आपली अधिकृत पावती जारी करतील.</p>
          
          <div class="pending-ledger-details">
            <div class="ledger-item">
              <span class="lbl">देणगी संदर्भ (Intent ID):</span>
              <span class="val">INT-2026-0842</span>
            </div>
            <div class="ledger-item">
              <span class="lbl">दाखल केलेला UTR:</span>
              <span class="val font-mono">429810384912</span>
            </div>
            <div class="ledger-item">
              <span class="lbl">भाविक नाव:</span>
              <span class="val">Rahul Sharma</span>
            </div>
            <div class="ledger-item">
              <span class="lbl">वर्गणी रक्कम:</span>
              <span class="val gold">₹५०१.००</span>
            </div>
            <div class="ledger-item">
              <span class="lbl">अपेक्षित वेळ:</span>
              <span class="val">२ ते ४ तास (Direct Bank Audit)</span>
            </div>
          </div>
          <div class="pending-footer">
            <span>ℹ️ पावती तयार झाल्यावर आपल्या मोबाईल नंबरवर WhatsApp/SMS द्वारे सूचना पाठवली जाईल.</span>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 6,
    id: 'scene_06',
    title: 'प्रशासकीय पडताळणी व पुनरावलोकन (Admin Review Suite)',
    subtitle: 'Scene 6: Admin Dashboard & Bank UTR Verification Modal',
    narration: 'From the administration suite, trustees verify the transaction directly against official bank statements and approve the record.',
    contentHtml: `
      <div class="admin-review-container">
        <div class="admin-topbar">
          <div class="admin-title">🔐 ट्रस्टी / अ‍ॅडमिन पोर्टल • UPI व्यवस्थापन कक्ष</div>
          <div class="admin-search-bar">
            <span>🔍 शोध:</span>
            <input type="text" value="429810384912" readonly class="search-input">
            <span class="match-badge">१ निकाल सापडला (1 Record Matched)</span>
          </div>
        </div>
        
        <div class="modal-overlay-mock">
          <div class="review-modal-box">
            <div class="review-modal-header">
              <span class="shield-icon">🛡️</span>
              <h3>व्यवहार अंतिम पुनरावलोकन (Verify & Confirm Transaction)</h3>
            </div>
            <div class="review-grid">
              <div class="rev-row">
                <span class="rev-lbl">भाविक नाव (Devotee):</span>
                <span class="rev-val">Rahul Sharma</span>
              </div>
              <div class="rev-row">
                <span class="rev-lbl">मोबाईल क्रमांक (Mobile):</span>
                <span class="rev-val">9820098200</span>
              </div>
              <div class="rev-row">
                <span class="rev-lbl">वर्गणी रक्कम (Amount):</span>
                <span class="rev-val gold-bold">₹५०१.००</span>
              </div>
              <div class="rev-row">
                <span class="rev-lbl">उत्सव श्रेणी (Category):</span>
                <span class="rev-val">गणेश जयंती उत्सव २०२६</span>
              </div>
              <div class="rev-row highlight-row">
                <span class="rev-lbl">बँक UTR क्रमांक:</span>
                <span class="rev-val font-mono">429810384912</span>
                <span class="badge-matched">बँक खात्याशी जुळले ✓</span>
              </div>
            </div>
            
            <div class="security-disclaimer">
              ✓ सुरक्षा तपासणी उत्तीर्ण: शून्य गुप्त माहिती प्रदर्शन (Zero Credentials Exposed)
            </div>
            
            <div class="review-actions">
              <button class="btn-danger">रद्द करा (Reject)</button>
              <button class="btn-confirm pulse-btn">सत्यापित करा व पावती जारी करा (Approve & Mint Receipt) ✓</button>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 7,
    id: 'scene_07',
    title: 'अधिकृत त्रिभाषिक पावती (Official Trilingual Receipt)',
    subtitle: 'Scene 7: Trilingual Certificate with Devanagari Typography',
    narration: 'Upon verification, an official trilingual receipt is minted in Marathi, Hindi, and English with authentic Devanagari typography.',
    contentHtml: `
      <div class="certificate-wrapper">
        <div class="certificate-frame">
          <div class="cert-border">
            <div class="cert-header">
              <div class="cert-seal">
                <div class="seal-placeholder">
                  <div class="seal-inner">
                    <span class="seal-om">ॐ</span>
                    <span class="seal-year">२०२६</span>
                  </div>
                </div>
              </div>
              <div class="cert-headings">
                <div class="cert-marathi">श्री सिद्धिविनायक मंदिर (नोंदणी क्र. महा/०८/२०२६)</div>
                <div class="cert-hindi">श्री सिद्धिविनायक मंदिर (पंजीकरण सं. महा/०८/२०२६)</div>
                <div class="cert-english">SHREE SIDDHIVINAYAK MANDIR TRUST (Reg: MH/08/2026)</div>
                <div class="cert-type">अधिकृत देणगी / वर्गणी पावती (Official Donation Receipt)</div>
              </div>
              <div class="cert-meta">
                <div class="receipt-no">पावती क्र. / No: <strong>EMM-2026-0182</strong></div>
                <div class="receipt-date">दिनांक / Date: <strong>14/09/2026</strong></div>
              </div>
            </div>
            
            <div class="cert-body">
              <div class="cert-line">
                <span class="cert-label">भाविकाचे नाव / Devotee Name:</span>
                <span class="cert-value">श्री / सौ. Rahul Sharma (राहुल शर्मा)</span>
              </div>
              <div class="cert-line">
                <span class="cert-label">मोबाईल क्रमांक / Mobile Number:</span>
                <span class="cert-value">9820098200</span>
              </div>
              <div class="cert-line">
                <span class="cert-label">सेवा / Seva Purpose:</span>
                <span class="cert-value">गणेश जयंती उत्सव २०२६ (Ganesh Jayanti 2026)</span>
              </div>
              <div class="cert-line">
                <span class="cert-label">बँक UTR संदर्भ / Transaction UTR:</span>
                <span class="cert-value font-mono">429810384912</span>
              </div>
              <div class="cert-amount-box">
                <div class="amt-words">
                  अक्षरी रक्कम / Words: <strong>पाचशे एक रुपये फक्त (Five Hundred and One Rupees Only)</strong>
                </div>
                <div class="amt-num">
                  ₹५०१.००
                </div>
              </div>
            </div>
            
            <div class="cert-footer">
              <div class="signature-col">
                <div class="sign-line"></div>
                <div class="sign-title">खजिनदार (Treasurer)</div>
              </div>
              <div class="blessing-col">
                <div class="blessing-text">॥ गणपती बाप्पा मोरया • आपल्या सर्व मनोकामना पूर्ण होवोत ॥</div>
                <div class="mandir-stamp">महा/०८/२०२६ • अधिकृत शिक्का</div>
              </div>
              <div class="signature-col">
                <div class="sign-line"></div>
                <div class="sign-title">अध्यक्ष / ट्रस्टी (President / Trustee)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 8,
    id: 'scene_08',
    title: 'भाविक पावती कक्ष व A5 PDF डाऊनलोड (Devotee Portal)',
    subtitle: 'Scene 8: A5 PDF Export & Instant WhatsApp Sharing',
    narration: 'Devotees can immediately view, print, or download their A5 PDF certificate and share it via WhatsApp.',
    contentHtml: `
      <div class="portal-download-container">
        <div class="devotee-card-view">
          <div class="devotee-portal-header">
            <div class="user-greeting">
              <span class="avatar">🙏</span>
              <div>
                <h3>नमस्कार, Rahul Sharma</h3>
                <span class="devotee-phone">मोबाईल: 9820098200</span>
              </div>
            </div>
            <div class="lang-switchers">
              <span class="lang-pill active">🌐 त्रिभाषिक (Trilingual)</span>
              <span class="lang-pill">मराठी</span>
              <span class="lang-pill">हिंदी</span>
              <span class="lang-pill">English</span>
            </div>
          </div>
          
          <div class="receipt-summary-item">
            <div class="receipt-badge-col">
              <div class="receipt-id">EMM-2026-0182</div>
              <div class="status-verified-badge">✓ सत्यापित व पूर्ण (VERIFIED & PAID)</div>
            </div>
            <div class="receipt-info-col">
              <div class="r-purpose">गणेश जयंती उत्सव २०२६</div>
              <div class="r-date">दिनांक: 14/09/2026 • UTR: 429810384912</div>
            </div>
            <div class="receipt-amt-col">
              <div class="r-amount">₹५०१.००</div>
            </div>
          </div>
          
          <div class="download-action-grid">
            <div class="download-card btn-pdf pulse-btn">
              <div class="dl-icon">📥</div>
              <div class="dl-text">
                <strong>A5 PDF पावती डाऊनलोड करा</strong>
                <span>High-resolution vector print ready</span>
              </div>
            </div>
            <div class="download-card btn-whatsapp">
              <div class="dl-icon">💬</div>
              <div class="dl-text">
                <strong>WhatsApp वर शेअर करा</strong>
                <span>पावती व बाप्पांचे शुभाशीर्वाद त्वरित पाठवा</span>
              </div>
            </div>
            <div class="download-card btn-print">
              <div class="dl-icon">🖨️</div>
              <div class="dl-text">
                <strong>थेट प्रिंट काढा (Print Receipt)</strong>
                <span>A5 / A4 ऑप्टिमाइझ केलेली पावती</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    num: 9,
    id: 'scene_09',
    title: 'श्री सिद्धिविनायक मंदिर — Transparent • Trusted • Connected',
    subtitle: 'Scene 9: Mandir Closing & Live Production Verification',
    narration: 'Shree Siddhivinayak Mandir — Transparent. Trusted. Connected. Ganpati Bappa Morya!',
    contentHtml: `
      <div class="closing-container">
        <div class="closing-card">
          <div class="closing-seal">ॐ</div>
          <h1 class="closing-title">श्री सिद्धिविनायक मंदिर</h1>
          <p class="closing-sub">नोंदणी क्र. महा/०८/२०२६ (Reg. No. MH/08/2026)</p>
          <div class="pillars-row">
            <div class="pillar">
              <div class="p-icon">🔒</div>
              <div class="p-title">१००% सुरक्षित व पारदर्शक</div>
              <div class="p-desc">सर्व व्यवहारांचे ऑडिट व डिजिटल बहीखाता</div>
            </div>
            <div class="pillar">
              <div class="p-icon">📜</div>
              <div class="p-title">त्रिभाषिक अधिकृत पावत्या</div>
              <div class="p-desc">मराठी, हिंदी व इंग्रजीत तत्काळ प्रमाणपत्र</div>
            </div>
            <div class="pillar">
              <div class="p-icon">🔔</div>
              <div class="p-title">दैनिक आरती सेवा</div>
              <div class="p-desc">सकाळी ०८:०० वा. • रात्री ०८:०० वा.</div>
            </div>
          </div>
          
          <div class="live-deployment-badge">
            🌐 Live Production: <span class="url">https://ekdant-mitra-mandal.onrender.com</span>
          </div>
          
          <div class="closing-blessing">
            ॥ गणपती बाप्पा मोरया • पुढच्या वर्षी लवकर या ॥
          </div>
        </div>
      </div>
    `
  }
];

function buildSlideHtml(scene) {
  return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>${scene.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Outfit:wght@400;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: radial-gradient(circle at 50% 20%, #2a1103 0%, #150702 50%, #0a0301 100%);
      color: #ffffff;
      font-family: 'Noto Sans Devanagari', 'Outfit', sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    
    /* Decorative Golden Border */
    body::before {
      content: '';
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      bottom: 16px;
      border: 2px solid rgba(245, 158, 11, 0.4);
      border-radius: 12px;
      pointer-events: none;
      z-index: 10;
    }
    
    /* Top Bar */
    .top-header {
      height: 100px;
      background: linear-gradient(180deg, rgba(30, 10, 5, 0.95) 0%, rgba(20, 5, 2, 0.8) 100%);
      border-bottom: 2px solid #d97706;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 48px;
      z-index: 20;
    }
    
    .brand-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .om-badge {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #ff9933 0%, #b45309 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
      border: 2px solid #fef3c7;
    }
    
    .header-text h2 {
      font-size: 26px;
      font-weight: 800;
      color: #fef3c7;
      letter-spacing: 0.5px;
    }
    
    .header-text span {
      font-size: 15px;
      color: #fed7aa;
      font-weight: 600;
    }
    
    .scene-tracker {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .scene-pill {
      background: #78350f;
      border: 1px solid #f59e0b;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 700;
      color: #fef3c7;
    }
    
    /* Center Stage */
    .center-stage {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 48px;
      position: relative;
      z-index: 5;
    }
    
    /* Narration Bottom Bar */
    .narration-bar {
      height: 120px;
      background: linear-gradient(180deg, rgba(15, 5, 2, 0.85) 0%, rgba(10, 2, 1, 0.98) 100%);
      border-top: 2px solid #d97706;
      display: flex;
      align-items: center;
      padding: 0 48px;
      gap: 24px;
      z-index: 20;
    }
    
    .narration-icon {
      width: 54px;
      height: 54px;
      background: #92400e;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      flex-shrink: 0;
      border: 2px solid #fbbf24;
    }
    
    .narration-content {
      flex: 1;
    }
    
    .narration-subtitle {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #f59e0b;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .narration-text {
      font-size: 20px;
      color: #f8fafc;
      line-height: 1.4;
      font-weight: 500;
    }
    
    /* Scene Specific Styling */
    /* Scene 1 */
    .hero-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 40px;
      width: 100%;
      max-width: 1600px;
    }
    .brand-badge {
      display: inline-block;
      background: rgba(217, 119, 6, 0.25);
      border: 1px solid #f59e0b;
      padding: 6px 16px;
      border-radius: 20px;
      color: #fde68a;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .hero-title {
      font-size: 52px;
      font-weight: 800;
      color: #fffbeb;
      line-height: 1.15;
      text-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .hero-en {
      font-size: 26px;
      color: #f59e0b;
      font-weight: 600;
    }
    .hero-tagline {
      font-size: 22px;
      color: #fbbf24;
      margin: 16px 0 24px;
      font-weight: 600;
    }
    .schedule-card {
      background: rgba(40, 15, 5, 0.85);
      border: 2px solid #b45309;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    .schedule-header {
      font-size: 18px;
      color: #fef3c7;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .schedule-rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sched-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(0,0,0,0.25);
      font-size: 16px;
    }
    .sched-item.highlight {
      background: rgba(217, 119, 6, 0.25);
      border-left: 4px solid #f59e0b;
    }
    .sched-val.gold {
      color: #fbbf24;
      font-weight: 700;
    }
    .hero-stats {
      display: flex;
      flex-direction: column;
      gap: 18px;
      justify-content: center;
    }
    .stat-box {
      background: rgba(30, 10, 5, 0.7);
      border: 1px solid rgba(245, 158, 11, 0.4);
      border-radius: 12px;
      padding: 18px 24px;
      text-align: center;
    }
    .stat-num {
      font-size: 38px;
      font-weight: 800;
      color: #f59e0b;
    }
    .stat-label {
      font-size: 15px;
      color: #cbd5e1;
    }
    .action-preview {
      display: flex;
      gap: 16px;
      margin-top: 10px;
    }
    .btn-primary {
      flex: 1;
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      color: #ffffff;
      border: none;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);
    }
    .btn-secondary {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
    }
    
    /* Form Styling (Scene 2 & 4) */
    .form-container {
      width: 100%;
      max-width: 1100px;
    }
    .form-card {
      background: rgba(25, 10, 4, 0.92);
      border: 2px solid #b45309;
      border-radius: 16px;
      padding: 36px 44px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    .form-card.highlight-card {
      border-color: #f59e0b;
      box-shadow: 0 0 35px rgba(245, 158, 11, 0.25);
    }
    .step-indicator {
      font-size: 14px;
      text-transform: uppercase;
      color: #f59e0b;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .form-header h2 {
      font-size: 32px;
      color: #fffbeb;
      font-weight: 800;
    }
    .sub-lead {
      font-size: 16px;
      color: #cbd5e1;
      margin-top: 6px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 28px 0;
    }
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .input-group.full-width {
      grid-column: span 2;
    }
    .input-group label {
      font-size: 15px;
      color: #fde68a;
      font-weight: 600;
    }
    .filled-input {
      background: rgba(15, 5, 2, 0.85);
      border: 1.5px solid #d97706;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 18px;
      color: #ffffff;
      font-weight: 600;
      outline: none;
    }
    .amount-field {
      display: flex;
      align-items: center;
      background: rgba(15, 5, 2, 0.85);
      border: 1.5px solid #d97706;
      border-radius: 8px;
      padding: 0 16px;
    }
    .currency-symbol {
      font-size: 24px;
      font-weight: 800;
      color: #fbbf24;
      margin-right: 8px;
    }
    .amount-val {
      border: none !important;
      padding: 14px 0 !important;
      font-size: 24px !important;
      font-weight: 800 !important;
      color: #fbbf24 !important;
      background: transparent !important;
    }
    .form-footer {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 24px;
    }
    .note {
      font-size: 14px;
      color: #cbd5e1;
      text-align: center;
    }
    
    /* Scene 3: UPI QR */
    .upi-modal-layout {
      width: 100%;
      max-width: 1000px;
    }
    .upi-card {
      background: rgba(25, 10, 4, 0.95);
      border: 2px solid #f59e0b;
      border-radius: 16px;
      padding: 36px 44px;
      box-shadow: 0 0 50px rgba(245, 158, 11, 0.3);
    }
    .upi-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .secure-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .upi-header h3 {
      font-size: 30px;
      font-weight: 800;
      color: #fffbeb;
    }
    .intent-pill {
      display: inline-block;
      background: #78350f;
      color: #fef3c7;
      padding: 6px 18px;
      border-radius: 20px;
      font-size: 16px;
      margin-top: 10px;
      border: 1px solid #b45309;
    }
    .upi-body {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 40px;
      align-items: center;
    }
    .qr-box {
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .qr-label {
      color: #1e293b;
      font-weight: 700;
      font-size: 14px;
      margin-top: 8px;
    }
    .upi-details-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .pay-amount-box {
      background: rgba(217, 119, 6, 0.25);
      border: 1.5px solid #f59e0b;
      border-radius: 10px;
      padding: 16px 20px;
    }
    .pay-lbl {
      font-size: 14px;
      color: #fef3c7;
    }
    .pay-val {
      font-size: 36px;
      font-weight: 800;
      color: #fbbf24;
    }
    .inr {
      font-size: 22px;
      color: #fef3c7;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
      font-size: 16px;
    }
    .detail-row span {
      color: #cbd5e1;
    }
    .detail-row code {
      background: #451a03;
      padding: 4px 10px;
      border-radius: 6px;
      color: #fbbf24;
      font-size: 16px;
    }
    .supported-apps {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    .app-tag {
      background: rgba(255,255,255,0.1);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.2);
    }
    
    /* Scene 4: UTR Entry */
    .utr-input-box {
      background: rgba(15, 5, 2, 0.85);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .utr-label {
      display: block;
      font-size: 17px;
      color: #fde68a;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .utr-display-row {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .utr-input {
      flex: 1;
      font-family: monospace;
      font-size: 32px;
      letter-spacing: 4px;
      font-weight: 800;
      color: #34d399;
      background: #0f172a;
      border: 2px solid #10b981;
      padding: 12px 20px;
      border-radius: 8px;
      outline: none;
    }
    .check-valid {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 12px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
    }
    .utr-hints {
      font-size: 14px;
      color: #94a3b8;
      margin-top: 12px;
    }
    .summary-chip-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .chip {
      flex: 1;
      background: rgba(255,255,255,0.06);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      color: #e2e8f0;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .success-btn {
      background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    }
    
    /* Scene 5: Pending State */
    .pending-container {
      width: 100%;
      max-width: 950px;
    }
    .pending-card {
      background: rgba(25, 10, 4, 0.95);
      border: 2px solid #d97706;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    .pending-icon-circle {
      width: 80px;
      height: 80px;
      background: rgba(245, 158, 11, 0.2);
      border: 2px solid #f59e0b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin: 0 auto 16px;
    }
    .status-badge-pending {
      display: inline-block;
      background: #78350f;
      color: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 6px 18px;
      border-radius: 20px;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .pending-card h2 {
      font-size: 32px;
      color: #fffbeb;
      margin-bottom: 12px;
    }
    .pending-msg {
      font-size: 17px;
      color: #cbd5e1;
      max-width: 750px;
      margin: 0 auto 28px;
      line-height: 1.5;
    }
    .pending-ledger-details {
      background: rgba(15, 5, 2, 0.8);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: left;
      margin-bottom: 24px;
    }
    .ledger-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
    }
    .ledger-item .lbl {
      color: #94a3b8;
      font-size: 15px;
    }
    .ledger-item .val {
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
    }
    .font-mono {
      font-family: monospace !important;
      letter-spacing: 1px;
    }
    .pending-footer {
      font-size: 14px;
      color: #fde68a;
    }
    
    /* Scene 6: Admin Review */
    .admin-review-container {
      width: 100%;
      max-width: 1200px;
    }
    .admin-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      border: 1px solid #334155;
      padding: 14px 24px;
      border-radius: 10px 10px 0 0;
    }
    .admin-title {
      font-size: 17px;
      font-weight: 700;
      color: #38bdf8;
    }
    .admin-search-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-input {
      background: #0f172a;
      border: 1px solid #0284c7;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 15px;
      font-family: monospace;
      outline: none;
    }
    .match-badge {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .modal-overlay-mock {
      background: rgba(10, 2, 1, 0.95);
      border: 2px solid #0284c7;
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 32px 40px;
    }
    .review-modal-box {
      max-width: 900px;
      margin: 0 auto;
    }
    .review-modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .review-modal-header h3 {
      font-size: 26px;
      color: #f8fafc;
    }
    .shield-icon {
      font-size: 28px;
    }
    .review-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 20px;
    }
    .rev-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .rev-row.highlight-row {
      border-bottom: none;
      background: rgba(2, 132, 199, 0.15);
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 6px;
    }
    .rev-lbl {
      color: #94a3b8;
      font-size: 16px;
    }
    .rev-val {
      color: #f8fafc;
      font-weight: 700;
      font-size: 18px;
    }
    .gold-bold {
      color: #fbbf24;
      font-size: 24px;
    }
    .badge-matched {
      background: #059669;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
    }
    .security-disclaimer {
      font-size: 14px;
      color: #38bdf8;
      margin-bottom: 24px;
      text-align: center;
    }
    .review-actions {
      display: flex;
      gap: 20px;
    }
    .btn-danger {
      flex: 0.3;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 14px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
    }
    .btn-confirm {
      flex: 0.7;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      padding: 14px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
    }
    
    /* Scene 7: Certificate */
    .certificate-wrapper {
      width: 100%;
      max-width: 1050px;
    }
    .certificate-frame {
      background: #fffdf7;
      color: #1a0a02;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 12px 50px rgba(0,0,0,0.8);
    }
    .cert-border {
      border: 4px double #b45309;
      padding: 28px 36px;
      position: relative;
    }
    .cert-header {
      display: grid;
      grid-template-columns: 80px 1fr 180px;
      gap: 20px;
      align-items: center;
      border-bottom: 2px solid #b45309;
      padding-bottom: 16px;
    }
    .seal-placeholder {
      width: 76px;
      height: 76px;
      border: 2px dashed #b45309;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fffbeb;
    }
    .seal-inner {
      text-align: center;
    }
    .seal-om {
      font-size: 28px;
      color: #b45309;
      font-weight: bold;
      display: block;
    }
    .seal-year {
      font-size: 11px;
      font-weight: 800;
      color: #b45309;
    }
    .cert-headings {
      text-align: center;
    }
    .cert-marathi {
      font-size: 22px;
      font-weight: 800;
      color: #78350f;
    }
    .cert-hindi {
      font-size: 17px;
      font-weight: 700;
      color: #92400e;
    }
    .cert-english {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #451a03;
    }
    .cert-type {
      font-size: 15px;
      font-weight: 800;
      color: #b45309;
      background: #fef3c7;
      display: inline-block;
      padding: 3px 12px;
      border-radius: 12px;
      margin-top: 6px;
    }
    .cert-meta {
      text-align: right;
      font-size: 13px;
      color: #78350f;
    }
    .cert-body {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cert-line {
      display: flex;
      align-items: baseline;
      gap: 12px;
      font-size: 16px;
    }
    .cert-label {
      width: 320px;
      color: #78350f;
      font-weight: 700;
    }
    .cert-value {
      flex: 1;
      font-weight: 700;
      color: #1c1917;
      border-bottom: 1px dotted #d97706;
      padding-bottom: 2px;
    }
    .cert-amount-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fef3c7;
      border: 1.5px solid #d97706;
      padding: 12px 20px;
      border-radius: 6px;
      margin-top: 10px;
    }
    .amt-words {
      font-size: 15px;
      color: #78350f;
    }
    .amt-num {
      font-size: 28px;
      font-weight: 800;
      color: #b45309;
    }
    .cert-footer {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      gap: 20px;
      align-items: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #d97706;
    }
    .signature-col {
      text-align: center;
    }
    .sign-line {
      border-top: 1px solid #1c1917;
      width: 140px;
      margin: 0 auto 6px;
    }
    .sign-title {
      font-size: 13px;
      font-weight: 700;
      color: #78350f;
    }
    .blessing-col {
      text-align: center;
    }
    .blessing-text {
      font-size: 14px;
      font-weight: 700;
      color: #b45309;
    }
    .mandir-stamp {
      font-size: 12px;
      color: #92400e;
      margin-top: 4px;
      font-weight: 600;
    }
    
    /* Scene 8: Devotee Portal */
    .portal-download-container {
      width: 100%;
      max-width: 1100px;
    }
    .devotee-card-view {
      background: rgba(25, 10, 4, 0.95);
      border: 2px solid #b45309;
      border-radius: 16px;
      padding: 36px 44px;
    }
    .devotee-portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .user-greeting {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar {
      font-size: 36px;
    }
    .user-greeting h3 {
      font-size: 24px;
      color: #fffbeb;
    }
    .devotee-phone {
      font-size: 15px;
      color: #94a3b8;
    }
    .lang-switchers {
      display: flex;
      gap: 10px;
    }
    .lang-pill {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 14px;
      color: #e2e8f0;
    }
    .lang-pill.active {
      background: #b45309;
      border-color: #f59e0b;
      color: #fffbeb;
      font-weight: 700;
    }
    .receipt-summary-item {
      background: rgba(15, 5, 2, 0.85);
      border: 1.5px solid #10b981;
      border-radius: 10px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    .receipt-id {
      font-size: 20px;
      font-weight: 800;
      color: #34d399;
      font-family: monospace;
    }
    .status-verified-badge {
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
    .r-purpose {
      font-size: 18px;
      font-weight: 700;
      color: #fffbeb;
    }
    .r-date {
      font-size: 14px;
      color: #94a3b8;
    }
    .r-amount {
      font-size: 32px;
      font-weight: 800;
      color: #fbbf24;
    }
    .download-action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .download-card {
      padding: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
    }
    .btn-pdf {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);
    }
    .btn-whatsapp {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      box-shadow: 0 4px 15px rgba(5, 150, 105, 0.4);
    }
    .btn-print {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .dl-icon {
      font-size: 32px;
    }
    .dl-text strong {
      display: block;
      font-size: 16px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .dl-text span {
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    }
    
    /* Scene 9: Closing */
    .closing-container {
      width: 100%;
      max-width: 1100px;
    }
    .closing-card {
      background: rgba(25, 10, 4, 0.95);
      border: 2px solid #f59e0b;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      box-shadow: 0 0 60px rgba(245, 158, 11, 0.3);
    }
    .closing-seal {
      width: 90px;
      height: 90px;
      background: linear-gradient(135deg, #ff9933 0%, #b45309 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 50px;
      font-weight: bold;
      color: #ffffff;
      margin: 0 auto 16px;
      border: 3px solid #fef3c7;
      box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
    }
    .closing-title {
      font-size: 48px;
      font-weight: 800;
      color: #fffbeb;
      margin-bottom: 8px;
    }
    .closing-sub {
      font-size: 18px;
      color: #fde68a;
      margin-bottom: 32px;
    }
    .pillars-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
      margin-bottom: 36px;
    }
    .pillar {
      background: rgba(15, 5, 2, 0.7);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 12px;
      padding: 24px 18px;
    }
    .p-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .p-title {
      font-size: 18px;
      font-weight: 700;
      color: #fef3c7;
      margin-bottom: 6px;
    }
    .p-desc {
      font-size: 14px;
      color: #cbd5e1;
    }
    .live-deployment-badge {
      display: inline-block;
      background: #1e293b;
      border: 1px solid #0284c7;
      color: #38bdf8;
      padding: 10px 24px;
      border-radius: 24px;
      font-size: 16px;
      margin-bottom: 24px;
    }
    .live-deployment-badge .url {
      color: #ffffff;
      font-weight: 700;
    }
    .closing-blessing {
      font-size: 26px;
      font-weight: 800;
      color: #fbbf24;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    
    /* Animation accents */
    .pulse-btn {
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
    }
  </style>
</head>
<body>
  <!-- Header -->
  <header class="top-header">
    <div class="brand-left">
      <div class="om-badge">ॐ</div>
      <div class="header-text">
        <h2>श्री सिद्धिविनायक मंदिर (Shree Siddhivinayak Mandir)</h2>
        <span>अधिकृत नोंदणी: MH/08/2026 (महा/०८/२०२६) • भाविक देणगी व पावती प्रणाली</span>
      </div>
    </div>
    <div class="scene-tracker">
      <div class="scene-pill">Scene ${scene.num} of 9</div>
    </div>
  </header>

  <!-- Center Presentation -->
  <main class="center-stage">
    ${scene.contentHtml}
  </main>

  <!-- Narration Caption -->
  <footer class="narration-bar">
    <div class="narration-icon">🎙️</div>
    <div class="narration-content">
      <div class="narration-subtitle">${scene.subtitle}</div>
      <div class="narration-text">${scene.narration}</div>
    </div>
  </footer>
</body>
</html>`;
}

// 1. Generate audio track (75 seconds, 44100Hz 16-bit PCM mono)
function generateAudioTrack(wavPath, totalDurationSeconds = 75) {
  console.log(`🎵 Synthesizing meditative temple bell & chime soundtrack (${totalDurationSeconds}s)...`);
  const sampleRate = 44100;
  const numSamples = sampleRate * totalDurationSeconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Scene transition timestamps (every 8.33 seconds)
  const sceneInterval = totalDurationSeconds / 9;
  const chimes = [];
  for (let s = 0; s < 9; s++) {
    chimes.push(s * sceneInterval);
  }

  // Bell base frequencies: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
  const bellFrequencies = [523.25, 659.25, 783.99, 1046.5, 523.25, 659.25, 783.99, 1046.5, 523.25];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Warm gentle ambient drone (Om drone: 108 Hz + 216 Hz)
    const drone = (Math.sin(2 * Math.PI * 108 * t) * 0.08 + Math.sin(2 * Math.PI * 216 * t) * 0.04) * 
                  (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.2 * t));

    // Chimes at scene changes
    let chimeVal = 0;
    for (let c = 0; c < chimes.length; c++) {
      const chimeTime = chimes[c];
      if (t >= chimeTime && t < chimeTime + 6.0) {
        const dt = t - chimeTime;
        const f0 = bellFrequencies[c];
        // Tibetan/temple bell harmonic series
        const bell = (
          Math.sin(2 * Math.PI * f0 * dt) * 0.35 +
          Math.sin(2 * Math.PI * (f0 * 2.01) * dt) * 0.18 +
          Math.sin(2 * Math.PI * (f0 * 3.02) * dt) * 0.08 +
          Math.sin(2 * Math.PI * (f0 * 4.25) * dt) * 0.04
        ) * Math.exp(-1.4 * dt);
        chimeVal += bell;
      }
    }

    const mixed = Math.max(-1, Math.min(1, drone + chimeVal));
    buffer.writeInt16LE(Math.floor(mixed * 32767), 44 + i * 2);
  }

  fs.writeFileSync(wavPath, buffer);
  console.log(`✅ Audio track generated: ${wavPath} (${buffer.length} bytes)`);
}

async function main() {
  console.log('====================================================');
  console.log('🎬 GENERATING OFFICIAL TUTORIAL WALKTHROUGH VIDEO');
  console.log('====================================================');
  
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  // Step 1: Render HTML and capture 1920x1080 screenshot for each scene
  const framePaths = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const htmlPath = path.join(FRAMES_DIR, `${scene.id}.html`);
    const pngPath = path.join(FRAMES_DIR, `${scene.id}.png`);
    
    fs.writeFileSync(htmlPath, buildSlideHtml(scene));
    console.log(`📸 Capturing Scene ${scene.num}/9: ${scene.title}...`);
    
    const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1920,1080 --screenshot="${pngPath}" "file://${htmlPath}"`;
    execSync(cmd, { stdio: 'ignore' });
    
    if (!fs.existsSync(pngPath)) {
      throw new Error(`Failed to capture screenshot for ${scene.id}`);
    }
    const stat = fs.statSync(pngPath);
    console.log(`   ✓ Captured ${scene.id}.png (${Math.round(stat.size / 1024)} KB)`);
    framePaths.push(pngPath);
  }

  // Step 2: Generate 75-second audio
  const audioWavPath = path.join(FRAMES_DIR, 'soundtrack.wav');
  generateAudioTrack(audioWavPath, 75);

  // Step 3: Build ffmpeg concat demuxer file
  // Each slide lasts 8.333 seconds (total 75 seconds for 9 slides)
  const concatListPath = path.join(FRAMES_DIR, 'slides.txt');
  const slideDuration = 75 / 9; // 8.333333 seconds
  let concatContent = '';
  for (let i = 0; i < framePaths.length; i++) {
    concatContent += `file '${framePaths[i]}'\n`;
    concatContent += `duration ${slideDuration.toFixed(6)}\n`;
  }
  // Repeat last frame per ffmpeg concat demuxer requirement
  concatContent += `file '${framePaths[framePaths.length - 1]}'\n`;
  fs.writeFileSync(concatListPath, concatContent);

  // Step 4: Encode MP4 with ffmpeg
  const outputMp4Path = path.join(OUTPUT_DIR, 'tutorial_walkthrough.mp4');
  console.log(`🎥 Compiling MP4 video to ${outputMp4Path}...`);

  const ffmpegCmd = [
    '/opt/homebrew/bin/ffmpeg',
    '-y',
    '-f concat',
    '-safe 0',
    `-i "${concatListPath}"`,
    `-i "${audioWavPath}"`,
    '-c:v libx264',
    '-preset medium',
    '-crf 20',
    '-pix_fmt yuv420p',
    '-r 30',
    '-c:a aac',
    '-b:a 192k',
    '-shortest',
    `-movflags +faststart`,
    `"${outputMp4Path}"`
  ].join(' ');

  console.log(`Executing FFmpeg command...`);
  execSync(ffmpegCmd, { stdio: 'inherit' });

  // Step 5: Verify MP4 with ffprobe
  console.log(`🔍 Verifying video properties with ffprobe...`);
  const probeOutput = execSync(
    `/opt/homebrew/bin/ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of json "${outputMp4Path}"`
  ).toString();

  const probeData = JSON.parse(probeOutput);
  console.log('Video Metadata:', JSON.stringify(probeData, null, 2));

  // Step 6: Copy to conversation artifact directory
  const artifactMp4 = path.join(ARTIFACT_DIR, 'tutorial_walkthrough.mp4');
  fs.copyFileSync(outputMp4Path, artifactMp4);
  console.log(`✅ Copied to artifact directory: ${artifactMp4}`);

  const fileSizeMB = (fs.statSync(outputMp4Path).size / (1024 * 1024)).toFixed(2);
  const durationSec = parseFloat(probeData.format.duration).toFixed(1);

  console.log('====================================================');
  console.log(`🎉 TUTORIAL VIDEO GENERATION COMPLETE!`);
  console.log(`   Path: ${outputMp4Path}`);
  console.log(`   Duration: ${durationSec} seconds`);
  console.log(`   File Size: ${fileSizeMB} MB`);
  console.log(`   Resolution: 1920x1080 Full HD @ 30fps`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal error generating walkthrough video:', err);
  process.exit(1);
});
