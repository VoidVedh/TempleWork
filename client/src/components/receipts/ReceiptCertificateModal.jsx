import React, { useRef, useState } from 'react';
import { X, MessageCircle, Download, Globe } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDate, formatDayMarathi } from '../../utils/dateUtils';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { receiptLabels } from '../../i18n/receiptTranslations';
import '../../styles/certificate.css';

export default function ReceiptCertificateModal({ isOpen, onClose, receipt }) {
  const certRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [receiptLang, setReceiptLang] = useState('trilingual'); // 'trilingual' | 'mr' | 'hi' | 'en'

  if (!isOpen || !receipt) return null;

  const labels = receiptLabels[receiptLang] || receiptLabels.trilingual;
  const currentYear = new Date().getFullYear();

  const handleWhatsAppShare = () => {
    const mobile = receipt.donor_mobile ? receipt.donor_mobile.replace(/\D/g, '') : '';
    const phoneWithCountry = mobile.startsWith('91') ? mobile : `91${mobile}`;
    const domainUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shree-siddhivinayak-mandir.onrender.com';
    const verifyUrl = `${domainUrl}/?verify=${encodeURIComponent(receipt.receipt_no)}`;
    
    const message = `🚩 *॥ श्री गणेशाय नमः ॥* 🚩\n*श्री सिद्धिविनायक मंदिर (ऐरोली सेक्टर-५, नवी मुंबई ४००७०८)*\n\n*सार्वजनिक गणेशोत्सव ${currentYear} अधिकृत देणगी पावती (E-Receipt)*\n----------------------------------\n*पावती क्र. / Receipt No.* : ${receipt.receipt_no}\n*दिनांक / Date* : ${formatDate(receipt.issue_date)}\n*दाता / Donor* : ${receipt.donor_name}\n*रक्कम / Amount* : ₹ ${Number(receipt.amount).toLocaleString('en-IN')}/-\n*अक्षरी / In Words* : ${receipt.amount_in_words}\n*पेमेंट मोड / Mode* : ${receipt.payment_mode}\n*स्थिती / Status* : ${receipt.payment_status === 'Paid' ? 'जमा / प्राप्त (PAID)' : 'येणे बाकी (UNPAID)'}\n*गोळाकर्ता / Collector* : ${receipt.collector_name}\n----------------------------------\n📄 *अधिकृत त्रिभाषी ई-पावती पहा व PDF डाउनलोड करा:*\n${verifyUrl}\n----------------------------------\n॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥\nआपल्या दानाबद्दल श्री सिद्धिविनायक मंदिर आपले मनःपूर्वक आभारी आहे! Thank you!`;

    const encoded = encodeURIComponent(message);
    const url = mobile ? `https://wa.me/${phoneWithCountry}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fffdfa'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`${receipt.receipt_no}_${receipt.donor_name.replace(/\s+/g, '_')}_${receiptLang}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation error. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="certificate-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="certificate-modal-header">
          <div className="cert-header-left">
            <span style={{ fontSize: '18px' }}>🚩</span>
            <div>
              <div className="cert-modal-title">{labels.certHeaderTitle}</div>
              <div className="cert-modal-sub">{receipt.receipt_no} • {receipt.donor_name}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} color="#fed7aa" />
          </button>
        </div>

        {/* Language Selection & Action Bar */}
        <div className="certificate-actions-bar" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {/* Trilingual Language Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={13} /> भाषा:
            </span>
            <div className="receipt-lang-pills" style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`btn-lang-pill ${receiptLang === 'trilingual' ? 'active' : ''}`}
                onClick={() => setReceiptLang('trilingual')}
                title="मराठी • हिंदी • English"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid #d97706',
                  background: receiptLang === 'trilingual' ? '#b45309' : '#fffbeb',
                  color: receiptLang === 'trilingual' ? '#ffffff' : '#92400e',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🌐 सर्व (Trilingual)
              </button>
              <button
                type="button"
                className={`btn-lang-pill ${receiptLang === 'mr' ? 'active' : ''}`}
                onClick={() => setReceiptLang('mr')}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid #d97706',
                  background: receiptLang === 'mr' ? '#b45309' : '#fffbeb',
                  color: receiptLang === 'mr' ? '#ffffff' : '#92400e',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                मराठी
              </button>
              <button
                type="button"
                className={`btn-lang-pill ${receiptLang === 'hi' ? 'active' : ''}`}
                onClick={() => setReceiptLang('hi')}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid #d97706',
                  background: receiptLang === 'hi' ? '#b45309' : '#fffbeb',
                  color: receiptLang === 'hi' ? '#ffffff' : '#92400e',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                हिंदी
              </button>
              <button
                type="button"
                className={`btn-lang-pill ${receiptLang === 'en' ? 'active' : ''}`}
                onClick={() => setReceiptLang('en')}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid #d97706',
                  background: receiptLang === 'en' ? '#b45309' : '#fffbeb',
                  color: receiptLang === 'en' ? '#ffffff' : '#92400e',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                English
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <button
              className="btn-whatsapp-share"
              onClick={handleWhatsAppShare}
              id="btn-cert-whatsapp-share"
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              className="btn-pdf-download"
              onClick={handleDownloadPDF}
              disabled={downloading}
              id="btn-cert-pdf-download"
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              <Download size={14} />
              <span>{downloading ? 'डाउनलोड...' : labels.pdfDownloadBtn}</span>
            </button>
          </div>
        </div>

        {/* The Sacred Certificate Body */}
        <div className="modal-body" style={{ backgroundColor: '#fdfbf7', padding: '10px' }}>
          <div className="certificate-canvas" ref={certRef}>
            <div className="cert-outer-border">
              <div className="cert-inner-border">
                {/* 4 Corner Auspicious Swastikas */}
                <span className="corner-swastik top-left">卐</span>
                <span className="corner-swastik top-right">卐</span>
                <span className="corner-swastik bottom-left">卐</span>
                <span className="corner-swastik bottom-right">卐</span>

                {/* Top Header Row with Ganesha and Shivaji Portraits */}
                <div className="cert-top-header">
                  <div className="cert-deity-box">
                    <img src="/assets/ganesha_logo.png" alt="Shree Ganesh" className="cert-deity-img" />
                  </div>

                  <div className="cert-header-center">
                    <div className="cert-invoc">॥ श्री गणेशाय नमः ॥ • ॥ श्री सिद्धिविनायक प्रसन्न ॥</div>
                    <div className="cert-mandal-name">श्री सिद्धिविनायक मंदिर</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b', letterSpacing: '0.3px', margin: '1px 0' }}>
                      SHREE SIDDHIVINAYAK MANDIR
                    </div>
                    <div className="cert-mandal-loc">ऐरोली सेक्टर-५, नवी मुंबई ४००७०८ (महाराष्ट्र)</div>
                    <div className="cert-badge-fest">
                      {receiptLang === 'trilingual' ? 'सार्वजनिक गणेशोत्सव • SARVAJANIK GANESHOTSAV' : labels.subTitle}
                    </div>
                    <div className="cert-sub-reg">
                      रजिस्ट्रेशन क्र. महा/०८/२०२६ (महाराष्ट्र राज्य) • Reg. No. MH/08/2026
                    </div>
                  </div>

                  <div className="cert-deity-box">
                    <img src="/assets/shivaji_portrait.png" alt="Shivaji Maharaj" className="cert-deity-img" />
                  </div>
                </div>

                {/* Yellow Strip: Receipt No, Date, Paid Status */}
                <div className="cert-info-bar">
                  <div className="cert-receipt-no">
                    <strong>{labels.receiptNoLabel}:</strong>{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{receipt.receipt_no}</span>
                  </div>
                  <div className="cert-date-day">
                    <strong>{labels.dateLabel}:</strong> {formatDate(receipt.issue_date)}{' '}
                    <span style={{ fontSize: '9px', color: '#78350f' }}>
                      ({receipt.marathi_day || formatDayMarathi(receipt.issue_date)})
                    </span>
                  </div>
                  <div>
                    {receipt.payment_status === 'Paid' ? (
                      <span className="cert-status-paid">
                        {receiptLang === 'en' ? '✓ PAID' : '✓ जमा / PAID'}
                      </span>
                    ) : (
                      <span className="cert-status-unpaid">
                        {receiptLang === 'en' ? '⏳ UNPAID' : '⏳ येणे बाकी / UNPAID'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Donor Details Table */}
                <table className="cert-details-table">
                  <tbody>
                    <tr>
                      <td className="cert-label-col">{labels.donorLabel}</td>
                      <td className="cert-val-col cert-donor-val">{receipt.donor_name}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{labels.mobileLabel}</td>
                      <td className="cert-val-col">+91 {receipt.donor_mobile || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{labels.addressLabel}</td>
                      <td className="cert-val-col">{receipt.address_galli || 'ऐरोली सेक्टर-५, नवी मुंबई ४००७०८'}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{labels.wordsLabel}</td>
                      <td className="cert-val-col cert-words-val">{receipt.amount_in_words}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{labels.modeLabel}</td>
                      <td className="cert-val-col">
                        <span className="cert-paymode-badge">{receipt.payment_mode}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{labels.collectorLabel}</td>
                      <td className="cert-val-col">
                        <span className="cert-karyakarta-badge">{receipt.collector_name}</span>
                      </td>
                    </tr>
                    {receipt.notes && (
                      <tr>
                        <td className="cert-label-col">{labels.purposeLabel}</td>
                        <td className="cert-val-col" style={{ color: '#64748b' }}>{receipt.notes}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Grand Total Amount Banner */}
                <div className="cert-total-banner">
                  <span className="cert-total-label">{labels.totalAmountLabel}</span>
                  <span className="cert-total-amount">{formatIndianCurrency(receipt.amount)} /-</span>
                </div>

                {/* Stamp & Signatures */}
                <div className="cert-signatures-row">
                  <div className="cert-sign-block">
                    <span className="cert-sign-name">{receipt.collector_name}</span>
                    <div className="cert-sign-line"></div>
                    <span className="cert-sign-role">{labels.collectorSign}</span>
                  </div>

                  <div className="cert-seal-block">
                    <img src="/assets/mandal_seal.svg" alt="Official Mandal Seal" className="cert-seal-img" />
                  </div>

                  <div className="cert-sign-block">
                    <span className="cert-sign-name">आनंद नाईक</span>
                    <div className="cert-sign-line"></div>
                    <span className="cert-sign-role">{labels.presidentSign}</span>
                  </div>
                </div>

                {/* Blessing & Cultural Thank You Footer */}
                <div className="cert-blessing-text">
                  {labels.thankYou}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            {labels.certIssuer} <strong>{receipt.collector_name}</strong>
          </span>
          <button className="btn btn-outline-white" style={{ color: '#475569', borderColor: '#cbd5e1' }} onClick={onClose}>
            {labels.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
