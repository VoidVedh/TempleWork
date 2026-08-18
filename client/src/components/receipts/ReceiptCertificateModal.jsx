import React, { useRef, useState } from 'react';
import { X, MessageCircle, Download, Check, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDate, formatDayMarathi } from '../../utils/dateUtils';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/certificate.css';

export default function ReceiptCertificateModal({ isOpen, onClose, receipt }) {
  const { t } = useLanguage();
  const certRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleWhatsAppShare = () => {
    const mobile = receipt.donor_mobile ? receipt.donor_mobile.replace(/\D/g, '') : '';
    const phoneWithCountry = mobile.startsWith('91') ? mobile : `91${mobile}`;
    
    const message = `🚩 *॥ श्री गणेशाय नमः ॥* 🚩\n*एकदंत मित्र मंडळ, उचगाव (कोल्हापूर)*\n\n*सार्वजनिक गणेशोत्सव २०२४ वर्गणी पावती*\n----------------------------------\n*पावती क्र.* : ${receipt.receipt_no}\n*दिनांक* : ${formatDate(receipt.issue_date)}\n*दाता नाव* : ${receipt.donor_name}\n*रक्कम* : ₹ ${receipt.amount.toLocaleString('en-IN')}/-\n*अक्षरी* : ${receipt.amount_in_words}\n*पेमेंट मोड* : ${receipt.payment_mode}\n*स्थिती* : ${receipt.payment_status === 'Paid' ? 'जमा (PAID)' : 'येणे बाकी (UNPAID)'}\n*गोळाकर्ता* : ${receipt.collector_name}\n----------------------------------\n॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥\nआपल्या दानाबद्दल एकदंत मित्र मंडळ आपले मनःपूर्वक आभारी आहे!`;

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
      pdf.save(`${receipt.receipt_no}_${receipt.donor_name.replace(/\s+/g, '_')}.pdf`);
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
            <span style={{ fontSize: '16px' }}>🚩</span>
            <div>
              <div className="cert-modal-title">{t('certHeaderTitle')}</div>
              <div className="cert-modal-sub">{receipt.receipt_no} • {receipt.donor_name}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} color="#fed7aa" />
          </button>
        </div>

        {/* Action Buttons Bar */}
        <div className="certificate-actions-bar">
          <button
            className="btn-whatsapp-share"
            onClick={handleWhatsAppShare}
            id="btn-cert-whatsapp-share"
          >
            <MessageCircle size={16} />
            <span>
              {t('whatsappShareBtn')} {receipt.donor_mobile ? `+91 ${receipt.donor_mobile}` : ''}
            </span>
          </button>

          <button
            className="btn-pdf-download"
            onClick={handleDownloadPDF}
            disabled={downloading}
            id="btn-cert-pdf-download"
          >
            <Download size={16} />
            <span>{downloading ? 'डाउनलोड होत आहे...' : t('pdfDownloadBtn')}</span>
          </button>
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
                    <div className="cert-invoc">{t('invocation')}</div>
                    <div className="cert-mandal-name">{t('mandalName')}</div>
                    <div className="cert-mandal-loc">{t('mandalLocation')} (महाराष्ट्र)</div>
                    <div className="cert-badge-fest">{t('certBadge')}</div>
                    <div className="cert-reg-no">{t('regNo')} (महाराष्ट्र राज्य)</div>
                  </div>

                  <div className="cert-deity-box">
                    <img src="/assets/shivaji_portrait.png" alt="Shivaji Maharaj" className="cert-deity-img" />
                  </div>
                </div>

                {/* Yellow Strip: Receipt No, Date, Paid Status */}
                <div className="cert-info-bar">
                  <div className="cert-receipt-no">
                    <strong>{t('receiptNoLabel')}</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{receipt.receipt_no}</span>
                  </div>
                  <div className="cert-date-day">
                    <strong>{t('dateLabel')}</strong> {formatDate(receipt.issue_date)} ({receipt.marathi_day || formatDayMarathi(receipt.issue_date)})
                  </div>
                  <div>
                    {receipt.payment_status === 'Paid' ? (
                      <span className="cert-status-paid">✓ वर्गणी जमा (PAID)</span>
                    ) : (
                      <span className="cert-status-unpaid">⏳ येणे बाकी (UNPAID)</span>
                    )}
                  </div>
                </div>

                {/* Donor Details Table */}
                <table className="cert-details-table">
                  <tbody>
                    <tr>
                      <td className="cert-label-col">{t('donorLabel')}</td>
                      <td className="cert-val-col cert-donor-val">{receipt.donor_name}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{t('mobileLabel')}</td>
                      <td className="cert-val-col">+91 {receipt.donor_mobile || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{t('addressLabel')}</td>
                      <td className="cert-val-col">{receipt.address_galli || 'उचगाव (कोल्हापूर)'}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{t('wordsLabel')}</td>
                      <td className="cert-val-col cert-words-val">{receipt.amount_in_words}</td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{t('modeLabel')}</td>
                      <td className="cert-val-col">
                        <span className="cert-paymode-badge">{receipt.payment_mode}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="cert-label-col">{t('collectorLabel')}</td>
                      <td className="cert-val-col">
                        <span className="cert-karyakarta-badge">{receipt.collector_name}</span>
                      </td>
                    </tr>
                    {receipt.notes && (
                      <tr>
                        <td className="cert-label-col">विशेष नोंद / उद्देश :</td>
                        <td className="cert-val-col" style={{ color: '#64748b' }}>{receipt.notes}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Grand Total Amount Banner */}
                <div className="cert-total-banner">
                  <span className="cert-total-label">{t('totalAmountLabel')}</span>
                  <span className="cert-total-amount">{formatIndianCurrency(receipt.amount)} /-</span>
                </div>

                {/* Stamp & Signatures */}
                <div className="cert-signatures-row">
                  <div className="cert-sign-block">
                    <span className="cert-sign-name">{receipt.collector_name}</span>
                    <div className="cert-sign-line"></div>
                    <span className="cert-sign-role">{t('collectorSign')}</span>
                  </div>

                  <div className="cert-seal-block">
                    <img src="/assets/mandal_seal.svg" alt="Official Mandal Seal" className="cert-seal-img" />
                  </div>

                  <div className="cert-sign-block">
                    <span className="cert-sign-name">आनंद नाईक</span>
                    <div className="cert-sign-line"></div>
                    <span className="cert-sign-role">{t('presidentSign')}</span>
                  </div>
                </div>

                {/* Blessing Footer */}
                <div className="cert-blessing-text">
                  {t('blessing')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            {t('certIssuer')} <strong>{receipt.collector_name}</strong>
          </span>
          <button className="btn btn-outline-white" style={{ color: '#475569', borderColor: '#cbd5e1' }} onClick={onClose}>
            {t('cancelBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
