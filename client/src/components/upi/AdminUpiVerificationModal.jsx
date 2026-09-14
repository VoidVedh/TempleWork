import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Ban,
  Search
} from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { formatIndianCurrency } from '../../utils/numberToWords';
import { formatTimestamp } from '../../utils/dateUtils';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminUpiVerificationModal({ isOpen, onClose, onReceiptCreated }) {
  const { t } = useLanguage();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Verification Review Confirmation State
  const [verifyingItem, setVerifyingItem] = useState(null);

  // Reject Dialog Modal State
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('बँक खात्यात रक्कम जमा झालेली नाही किंवा चुकीचा UTR.');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/upi/pending');
      setPendingList(res.pending_contributions || []);
    } catch (err) {
      console.error('Fetch pending UPI error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPending();
      setSearchQuery('');
      setVerifyingItem(null);
      setRejectingItem(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredList = pendingList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.donor_name && item.donor_name.toLowerCase().includes(q)) ||
      (item.donor_mobile && item.donor_mobile.includes(q)) ||
      (item.upi_ref_no && item.upi_ref_no.toLowerCase().includes(q)) ||
      (item.intent_ref && item.intent_ref.toLowerCase().includes(q))
    );
  });

  const handleConfirmVerify = async () => {
    if (!verifyingItem) return;
    const item = verifyingItem;

    try {
      setActionLoadingId(item.id);
      const res = await apiRequest(`/upi/${item.id}/verify`, { method: 'POST' });
      alert(res.message || 'वर्गणी पडताळणी यशस्वी! अधिकृत पावती तयार झाली.');
      setVerifyingItem(null);
      await fetchPending();
      if (onReceiptCreated) {
        onReceiptCreated(res.receipt);
      }
    } catch (err) {
      alert(err.message || 'पडताळणी करताना त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectDialog = (item) => {
    setRejectingItem(item);
    setRejectionReason('बँक खात्यात रक्कम प्राप्त झालेली नाही किंवा चुकीचा UTR.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;

    try {
      setActionLoadingId(rejectingItem.id);
      await apiRequest(`/upi/${rejectingItem.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });
      alert('UPI वर्गणी नोंद अमान्य / रद्द केली गेली.');
      setRejectingItem(null);
      await fetchPending();
    } catch (err) {
      alert(err.message || 'त्रुटी आली.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '740px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header theme-maroon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="#fde047" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15.5px', color: '#ffffff', fontWeight: 900 }}>
                प्रलंबित ऑनलाइन वर्गणी पडताळणी (Online Payment Verification)
              </h3>
              <span style={{ fontSize: '10.5px', color: '#fef08a' }}>
                बँक खात्यातील नोंदीशी पडताळणी करूनच अधिकृत पावती जारी करा
              </span>
            </div>
          </div>
          <button
            className="btn btn-outline-white btn-icon-only"
            onClick={onClose}
            style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {/* Critical Verification Warning Banner */}
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '11.5px', color: '#78350f', lineHeight: 1.45 }}>
              <strong style={{ display: 'block', marginBottom: '2px', color: '#92400e' }}>
                ⚠️ महत्त्वाची आर्थिक सुरक्षा सूचना (Evidence-Based Verification Rule):
              </strong>
              दात्याने दिलेला UTR क्रमांक हा पुरावा नाही. मंडळाच्या <strong>बँक खाते किंवा व्यापारी UPI ॲपमध्ये</strong> प्रत्यक्ष रक्कम जमा झाल्याची खात्री करूनच <strong>'पडताळणी मंजूर करा'</strong>.
            </div>
          </div>

          {/* Search & Refresh Controls Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="नाव, मोबाईल किंवा UTR द्वारे शोधा..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
              />
            </div>
            <button
              type="button"
              onClick={fetchPending}
              className="btn btn-outline-white"
              style={{ padding: '6px 12px', fontSize: '11.5px', color: '#7f1d1d', borderColor: '#fed7aa', background: '#fffbeb', fontWeight: 700, height: '34px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>ताजे करा ({pendingList.length})</span>
            </button>
          </div>

          {loading ? (
            <div className="empty-state-text">प्रलंबित वर्गणी माहिती लोड होत आहे...</div>
          ) : filteredList.length === 0 ? (
            <div className="devotional-empty-box" style={{ padding: '36px 16px' }}>
              <span className="devotional-empty-icon">✨</span>
              <div className="devotional-empty-title">
                {searchQuery ? 'शोध परिणामात कोणतीही नोंद सापडली नाही' : 'कोणतीही प्रलंबित UPI वर्गणी नाही'}
              </div>
              <div className="devotional-empty-desc">
                {searchQuery ? 'कृपया दुसरा शब्द किंवा UTR क्रमांक टाकून पहा.' : 'सर्व प्राप्त ऑनलाइन वर्गणी नोंदी पडताळल्या गेल्या आहेत.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{item.donor_name}</span>
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                          {item.payment_app || 'UPI'}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span>📱 मो: <strong>{item.donor_mobile || 'N/A'}</strong></span>
                        <span>⏰ वेळ: {formatTimestamp(item.submitted_at || item.created_at)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                        {formatIndianCurrency(item.amount)}
                      </div>
                      <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 800, background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                        🟡 पडताळणी बाकी
                      </span>
                    </div>
                  </div>

                  {/* Reference Details Box */}
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>संदर्भ क्र. (Intent): </span>
                      <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{item.intent_ref || 'N/A'}</strong>
                    </div>

                    <div>
                      <span style={{ color: '#64748b' }}>दाव्याचा UTR क्र.: </span>
                      <strong style={{ color: '#7f1d1d', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.5px' }}>{item.upi_ref_no}</strong>
                    </div>

                    {item.notes && (
                      <div style={{ width: '100%', color: '#475569', fontSize: '11px', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: '4px' }}>
                        संकल्प / नोंद: "{item.notes}"
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      type="button"
                      className="btn btn-green"
                      style={{ fontSize: '12px', padding: '7px 14px', fontWeight: 800 }}
                      disabled={actionLoadingId === item.id}
                      onClick={() => setVerifyingItem(item)}
                      id={`btn-verify-upi-${item.id}`}
                    >
                      <CheckCircle size={15} />
                      <span>पडताळणी करा (Verify & Issue Receipt)</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-dark"
                      style={{ fontSize: '12px', padding: '7px 12px', background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', fontWeight: 700 }}
                      disabled={actionLoadingId === item.id}
                      onClick={() => openRejectDialog(item)}
                      id={`btn-reject-upi-${item.id}`}
                    >
                      <XCircle size={15} />
                      <span>अमान्य करा (Reject)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Review & Confirmation Sub-Modal */}
        {verifyingItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
            onClick={() => setVerifyingItem(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '2px solid #bbf7d0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '12px' }}>
                <CheckCircle size={22} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#14532d' }}>
                  वर्गणी पडताळणी निश्चित करा (Verify Contribution)
                </h4>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '12.5px', color: '#166534', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>दाता:</strong> {verifyingItem.donor_name}</div>
                <div><strong>मोबाईल:</strong> +91 {verifyingItem.donor_mobile}</div>
                <div><strong>रक्कम:</strong> <span style={{ fontSize: '15px', fontWeight: 900, color: '#15803d' }}>{formatIndianCurrency(verifyingItem.amount)}</span></div>
                <div><strong>दाव्याचा UTR:</strong> <code style={{ fontWeight: 800, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>{verifyingItem.upi_ref_no}</code></div>
                <div><strong>संदर्भ क्र.:</strong> {verifyingItem.intent_ref || 'N/A'}</div>
                <div><strong>नोंदणी वेळ:</strong> {formatTimestamp(verifyingItem.submitted_at || verifyingItem.created_at)}</div>
              </div>

              <p style={{ fontSize: '11.5px', color: '#475569', marginBottom: '14px', lineHeight: 1.4 }}>
                ⚠️ <em>आपण बँक स्टेटमेंटमध्ये ही रक्कम जमा झाल्याची खात्री केली आहे का? पडताळणी मंजूर केल्यास अधिकृत पावती क्रमांक तयार होईल व दात्यास उपलब्ध होईल.</em>
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setVerifyingItem(null)}
                  style={{ fontSize: '12px' }}
                >
                  रद्द करा (Cancel)
                </button>

                <button
                  type="button"
                  className="btn btn-green"
                  onClick={handleConfirmVerify}
                  style={{ fontSize: '12px', fontWeight: 800 }}
                  disabled={actionLoadingId === verifyingItem.id}
                >
                  {actionLoadingId === verifyingItem.id ? 'पावती तयार होत आहे...' : '✓ खात्री केली, पावती तयार करा (Verify)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Prompt Sub-Modal */}
        {rejectingItem && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
            onClick={() => setRejectingItem(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', marginBottom: '10px' }}>
                <Ban size={20} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900 }}>
                  UPI वर्गणी नोंद अमान्य करा
                </h4>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>
                दाता: <strong>{rejectingItem.donor_name}</strong> | UTR: <strong>{rejectingItem.upi_ref_no}</strong> | रक्कम: <strong>₹{rejectingItem.amount}</strong>
              </p>

              <div className="form-group">
                <label className="form-label">* अमान्य करण्याचे कारण (REASON):</label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ resize: 'none', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRejectingItem(null)}
                  style={{ fontSize: '12px' }}
                >
                  रद्द करा
                </button>

                <button
                  type="button"
                  className="btn btn-crimson"
                  onClick={handleConfirmReject}
                  style={{ fontSize: '12px' }}
                  disabled={actionLoadingId === rejectingItem.id}
                >
                  {actionLoadingId === rejectingItem.id ? 'प्रक्रिया सुरू आहे...' : 'होय, अमान्य करा'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
